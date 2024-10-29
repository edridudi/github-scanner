<template>
  <v-container class="fill-height">
    <v-snackbar v-model="snackbar.enabled">
      {{ snackbar.text }}
    </v-snackbar>
    <v-responsive
      class="align-centerfill-height mx-auto"
      max-width="900"
    >
      <v-img
        class="mb-4"
        height="150"
        src="@/assets/Ox.avif"
      />

      <div class="text-center pt-4">

        <h1 class="text-h2 font-weight-bold">GitHub Scanner</h1>
      </div>

      <div class="py-4" />

      <v-row>
        <v-col cols="12">
          <v-card
            class="py-4"
            variant="flat"
          >
            <v-card-title class="px-0">
              <v-text-field
                v-model="gitHubToken"
                variant="outlined"
                label="GitHub Token"
                density="comfortable"
              >
                <template #append>
                  <v-btn
                    variant="flat"
                    height="48"
                    size="x-large"
                    density="comfortable"
                    text="Scan Repositories"
                    color="primary"
                    :disabled="!gitHubToken"
                    @click="scanRepositories"
                    :loading="loading"
                  >

                  </v-btn>
                </template>

              </v-text-field>
            </v-card-title>
            <v-card-text class="px-0" v-if="repositories.length > 0">
              <v-card variant="outlined">
                <v-card-title class="bg-indigo text-white text-h5">
                  Repositories
                </v-card-title>
                <v-card-text class="px-0">
                  <v-row>
                    <v-col cols="5">
                      <v-list v-model:selected="selectedRepo" density="compact">
                        <v-list-subheader>Repositories</v-list-subheader>
                        <v-list-item v-for="(repository, index) in repositories" :key="index" :value="repository" rounded="xl">
                          <template #title>
                            {{`${repository.name}`}}
                          </template>
                          <template #subtitle>
                            {{`${repository.owner} - ${repository.size} KB` }}
                          </template>
                        </v-list-item>
                      </v-list>
                      <v-pagination
                        density="compact"
                        style="max-width: 350px"
                        v-if="pages"
                        v-model="page"
                        :length="pages"
                      ></v-pagination>
                    </v-col>
                    <v-divider vertical></v-divider>
                    <v-col cols="7">
                      <v-scroll-y-transition mode="out-in">
                        <div
                          v-if="selectedRepo.length == 0"
                          class="text-h6 text-grey-lighten-1 font-weight-light"
                          style="align-self: center;"
                        >
                          Select a Repository
                        </div>
                        <v-card
                          v-else
                          class="pt-6"
                          style="background-color: transparent"
                          flat
                        >
                          <v-card-title class="text-center pt-6" v-if="loadingDetails">
                            <v-progress-circular size="100" indeterminate></v-progress-circular>
                          </v-card-title>
                          <v-card-text class="px-0" v-else>
                            <h3 class="text-h5 mb-2">
                              {{ repoDetails.name }}
                              <v-chip>{{ repoDetails.private ? 'Private' : 'Public'}}</v-chip>
                            </h3>
                            <div class="text-blue mb-2">
                              {{ repoDetails.owner }}
                            </div>
                            <v-divider></v-divider>
                            <v-card-title>Size: {{ `${repoDetails.size} KB` }}</v-card-title>
                            <v-card-title>Number of Files: {{ repoDetails.numberOfFiles }}</v-card-title>
                            <v-card-title>Yaml File Content:</v-card-title>
                            <v-card-text v-if="repoDetails.ymlFileContent" v-html="repoDetails.ymlFileContent"></v-card-text>
                            <v-card-title v-if="repoDetails.activeWebhooks && repoDetails.activeWebhooks.length > 0">Active Webhooks</v-card-title>
                            <v-card-text>{{ JSON.stringify(repoDetails.activeWebhooks) }}</v-card-text>
                          </v-card-text>
                        </v-card>
                      </v-scroll-y-transition>
                    </v-col>
                  </v-row>
                </v-card-text>
              </v-card>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
    </v-responsive>
  </v-container>
</template>

<script lang="ts">
import {defineComponent} from 'vue'
import {ApolloClient, createHttpLink, gql, InMemoryCache} from "@apollo/client/core";

export default defineComponent({
  name: "Main",
  watch: {
    async selectedRepo(val) {
      if (val.length > 0) {
        await this.repositoryDetails(val[0])
      }
    },
    async page(val) {
      if (val) {
        await this.scanRepositories()
      }
    }
  },
  methods: {
    async repositoryDetails(val: any) {
      if (!this.gitHubToken) return;
      this.loadingDetails = true
      try {
        if (!this.apolloClient) {
          console.error('Apollo Client not initialized');
          return;
        }
        const REPOSITORY_DETAILS = gql`
        query RepositoryDetails($token: String!, $repo: String!, $owner: String!) {
          repositoryDetails(token: $token, repo: $repo, owner: $owner) {
            activeWebhooks {
              active
              name
              id
            }
            name
            numberOfFiles
            owner
            private
            ymlFileContent
            size
          }
        }`;
        const response = await this.apolloClient
          .query({
            query: REPOSITORY_DETAILS,
            variables: { token: this.gitHubToken, owner: val.owner, repo: val.name }
          })
        this.repoDetails = response.data.repositoryDetails
      } catch (error) {
        console.error(error)
      }
      this.loadingDetails = false
    },
    async scanRepositories() {
      if (!this.gitHubToken) return;
      this.loading = true
      try {
        if (!this.apolloClient) {
          console.error('Apollo Client not initialized');
          return;
        }

        const FETCH_REPOSITORIES = gql`
        query ListRepositories($token: String!, $page: Int, $perPage: Int) {
          listRepositories(token: $token, page: $page, perPage: $perPage) {
            repos {
              name
              owner
              size
            }
            pageInfo {
              currentPage
              hasNextPage
              hasPreviousPage
              lastPage
              perPage
            }
          }
        }`;
        const response = await this.apolloClient
          .query({
            query: FETCH_REPOSITORIES,
            variables: { token: this.gitHubToken, page: this.page, perPage: this.perPage }
          })
        console.log(response)
        this.repositories = response.data.listRepositories.repos
        this.pages = response.data.listRepositories.pageInfo.lastPage
        this.page = response.data.listRepositories.pageInfo.currentPage
        this.perPage = response.data.listRepositories.pageInfo.perPage
      } catch (error: any) {
        this.snackbar.text = error.message;
        this.snackbar.enabled = true;
        console.error('Error fetching repositories:', error);
      }
      this.loading = false
    },
  },
  data: () => ({
    page: 1,
    perPage: 10,
    pages: null,
    gitHubToken: '',
    repositories: [] as any[],
    showDetails: false,
    selectedRepo: [] as any[],
    apolloClient: null as ApolloClient<any> | null,
    active: [],
    open: [],
    loading: false,
    loadingDetails: false,
    repoDetails: {} as any,
    snackbar: {
      enabled: false,
      text: ''
    }
  }),
  mounted() {
    const cache = new InMemoryCache();
    this.apolloClient = new ApolloClient({
      link: createHttpLink({
        uri: 'http://localhost:4000/',
      }),
      cache,
    });
  }
})
</script>
