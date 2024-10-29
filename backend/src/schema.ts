import {gql} from "apollo-server";

export const typeDefs = gql`
  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    currentPage: Int!
    lastPage: Int!
    perPage: Int!
  }

  type Repository {
    name: String!
    size: Int!
    owner: String!
  }
  
  type RepositoriesResponse {
    repos: [Repository!]!
    pageInfo: PageInfo!
  }

  type Webhook {
    id: ID!
    name: String!
    active: Boolean!
  }

  type RepositoryDetails {
    name: String!
    size: Int!
    owner: String!
    private: Boolean!
    numberOfFiles: Int!
    ymlFileContent: String
    activeWebhooks: [Webhook!]
  }

  type Query {
    listRepositories(token: String!, page: Int = 1, perPage: Int = 30): RepositoriesResponse!
    repositoryDetails(token: String!, owner: String!, repo: String!): RepositoryDetails!
  }
`;