# Use the official Node.js 16 image with Alpine Linux
FROM node:16-alpine

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the application's source code
COPY . .

# Expose the port your app runs on (e.g., 4000)
EXPOSE 4000

# Start the app
CMD ["npm", "start"]
