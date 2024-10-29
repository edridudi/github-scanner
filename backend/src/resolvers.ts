import dotenv from "dotenv";
import {GraphQLResolveInfo} from "graphql/type";
import {PageInfo, Repository, RepositoryDetails, Webhook} from "./types";
import axios from "axios";
import pLimit from 'p-limit';
dotenv.config();

const limit = pLimit(Number(process.env.CONCURRENCY));

function parseLinkHeader(header: string) {
    const links: any = {};
    const parts = header.split(',');

    parts.forEach((part) => {
        const section = part.split(';');
        if (section.length !== 2) {
            return;
        }
        const url = section[0].trim().replace(/<(.*)>/, '$1');
        const name = section[1].trim().replace(/rel="(.*)"/, '$1');
        const urlObj = new URL(url);
        const page = urlObj.searchParams.get('page') || '';
        links[name] = { url, page };
    });

    return links;
}

async function getRepositoryDetails(
    token: string,
    owner: string,
    repo: string
): Promise<RepositoryDetails> {
    try {
        const repoResponse = await axios.get(`https://api.github.com/repos/${owner}/${repo}`,
            {
                headers: {
                    Accept: 'application/vnd.github+json',
                    Authorization: `token ${token}`,
                },
            }
        );

        const repoData = repoResponse.data;

        console.log(`Scanning Repository ${repoData.owner.login}/${repoData.name}`);
        const {fileCount, ymlFileContent, activeWebhooks} = await limit(() => scanRepo(token, repoData.owner.login, repoData.name));
        return {
            name: repoData.name,
            size: repoData.size,
            owner: repoData.owner.login,
            private: repoData.private,
            numberOfFiles: fileCount,
            ymlFileContent: ymlFileContent,
            activeWebhooks: activeWebhooks,
        };
    } catch (error) {
        if (axios.isAxiosError(error) && error.response) {
            const status = error.response.status;
            const message = error.response.data.message;
            throw new Error(`GitHub API error (${status}): ${message}`);
        }
        throw new Error('An unexpected error occurred.');
    }
}

async function scanRepo(token: string, owner: string, repo: string): Promise<{fileCount: number, ymlFileContent: string, activeWebhooks: any}> {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`,
        {
            headers: {
                Accept: 'application/vnd.github.v3+json',
                Authorization: `token ${token}`,
            }
        }
    );

    const tree = response.data.tree;
    const blobs = tree.filter((item: any) => item.type === 'blob')
    const fileCount = blobs.length;

    const ymlFile = blobs.find(item => item.path.endsWith('.yml') || item.path.endsWith('.yaml'));
    let ymlFileContent = null;
    if (ymlFile) {
        ymlFileContent = await getFileContent(token, owner, repo, ymlFile.path);
    }
    const activeWebhooks = getActiveWebhooks(token, owner, repo);
    return {fileCount, ymlFileContent, activeWebhooks};
}

async function getFileContent(token: string, owner: string, repo: string, path: string): Promise<any> {
    const response = await axios.get(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: {
            Authorization: `token ${token}`,
        },
    });
    return Buffer.from(response.data.content, 'base64').toString('utf8');
}

async function getActiveWebhooks(token: string, owner: string, repo: string): Promise<Webhook[]> {
    const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/hooks`,
        {
            headers: {
                Accept: 'application/vnd.github+json',
                Authorization: `token ${token}`,
            },
        }
    );

    return response.data
        .filter((hook: any) => hook.active)
        .map((hook: any) => ({
            id: hook.id,
            name: hook.name,
            active: hook.active,
        }));
}

export default {
    Query: {
        listRepositories: async (
            _parent: unknown,
            args: {token: string, page?: number; perPage?: number},
            _context: unknown,
            _info: GraphQLResolveInfo
        ): Promise<{ repos: Repository[]; pageInfo: PageInfo }> => {
            const { token, page = 1, perPage = 30 } = args;

            if (!token) {
                throw new Error('GitHub token is not defined in environment variables.');
            }

            try {
                const response = await axios.get(`https://api.github.com/user/repos`, {
                    headers: {
                        Accept: 'application/vnd.github+json',
                        Authorization: `token ${token}`,
                    },
                    params: {
                        page,
                        per_page: perPage,
                    },
                });

                const linkHeader = response.headers['link'];
                let lastPage = page;
                let hasNextPage = false;
                let hasPreviousPage = false;

                if (linkHeader) {
                    const parsed = parseLinkHeader(linkHeader);
                    hasNextPage = !!parsed.next;
                    hasPreviousPage = !!parsed.prev;
                    if (parsed.last) {
                        lastPage = parseInt(parsed.last.page, 10);
                    }
                }

                const pageInfo: PageInfo = {
                    hasNextPage,
                    hasPreviousPage,
                    currentPage: page,
                    lastPage,
                    perPage,
                };

                return {
                    repos: response.data.map((repo: any) => ({
                        name: repo.name,
                        size: repo.size,
                        owner: repo.owner.login
                    })),
                    pageInfo,
                };
            } catch (error) {
                if (axios.isAxiosError(error) && error.response) {
                    if (error.response.status === 403) {
                        throw new Error('GitHub API rate limit exceeded or access forbidden.');
                    } else if (error.response.status === 401) {
                        throw new Error('Unauthorized. Check your GitHub token.');
                    }
                }
                console.error(error);
                throw new Error('Failed to fetch repositories');
            }
        },

        repositoryDetails: async (
            _parent: unknown,
            args: { token: string, owner: string, repo: string },
            _context: unknown,
            _info: GraphQLResolveInfo
        ): Promise<Repository> => {
            const { token, owner, repo } = args;

            return getRepositoryDetails(token, owner, repo);
        },
    },
}