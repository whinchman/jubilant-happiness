# TODO-ER server — builds the phone PWA and serves it alongside the API at runtime.
# Build context is the repo root.
FROM node:22-slim

RUN npm install -g pnpm@10.29.3

WORKDIR /app
COPY . .

# Install all deps (devDeps included — we need tsx at runtime + Vite to build the phone),
# then build the phone's static bundle into apps/phone/dist.
RUN pnpm install --frozen-lockfile && pnpm --filter @todoer/phone build

WORKDIR /app/apps/server
ENV NODE_ENV=production
EXPOSE 3000
CMD ["pnpm", "start"]
