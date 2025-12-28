# Use an official Node.js runtime as a parent image
FROM node:18-bullseye-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (including devDependencies for build)
RUN npm install

# Copy the application code
COPY . .

# Build TypeScript
RUN npm run build

# Expose the application port
EXPOSE 3000

# Start the application
# CMD ["npm", "start"]
CMD ["npm", "run", "dev"]