# Use the official Node.js image
FROM node:18-bullseye-slim

# Set working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
#RUN rm -rf node_modules package-lock.json
RUN npm install

# Copy the Vue.js app source code
COPY . .

# Expose the port for the Vue.js app
EXPOSE 5173

# Start Nginx
CMD ["npm", "run", "dev"]
