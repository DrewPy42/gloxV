# Use an official Node.js runtime as a parent image
FROM node:18-bullseye-slim

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the application code
COPY . .

# Expose the application port
EXPOSE 3000

# Start the application
# CMD ["npm", "run", "dev"]
CMD ["npx", "nodemon", "server.js"]
