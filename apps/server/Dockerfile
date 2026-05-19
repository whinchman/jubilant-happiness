# TODO-ER API server. Build context is the repo root.
FROM node:22-slim

RUN npm install -g pnpm@10.29.3

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/server
EXPOSE 3000
CMD ["pnpm", "start"]
