# ---- dev: ts-node-dev with reload (used by docker-compose.dev.yml) ----
FROM node:26-bookworm-slim AS dev
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- build: compile TypeScript ----
FROM dev AS build
RUN npm run build

# ---- production: compiled JS and runtime dependencies only ----
FROM node:26-bookworm-slim AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
USER node
EXPOSE 3000
CMD ["npm", "start"]
