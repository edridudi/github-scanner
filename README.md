# Github Repository Scanner
This project is a web application that allows users to scan their GitHub repositories using a personal developer token. It consists of a backend built with Node.js and Apollo GraphQL server, and a frontend built with Vuetify 3 running on Nginx. The application supports two main functionalities:

List Repositories: Displays a list of repositories along with their names, sizes, and owners.
Repository Details: Provides detailed information about a selected repository, including the number of files, content of a YAML file, and active webhooks.

![](https://raw.githubusercontent.com/edridudi/github-scanner/e80491d4b53e729a0871b4e7a110129e7fdbbf17/.github/img.png)

## Usage
1. Run the docker-compose.yml File:
    ```bash
    docker compose -f docker-compose.yml -p github-scanner up -d
    ```
2. Browse to http://localhost:8080/.
3. Enter a valid GitHub Repository Token.
4. Press on "Scan Repositories".
5. Select a Repository to check Repo Details.



