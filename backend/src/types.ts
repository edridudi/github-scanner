export interface PageInfo {
    hasNextPage: boolean;
    hasPreviousPage: boolean;
    currentPage: number;
    lastPage: number;
    perPage: number;
}

export interface Repository {
    name: string;
    size: number;
    owner: string;
}

export interface Webhook {
    id: string;
    name: string;
    active: boolean;
}

export interface RepositoryDetails extends Repository {
    private: boolean;
    numberOfFiles: number;
    ymlFileContent: string | null;
    activeWebhooks: Webhook[];
}
