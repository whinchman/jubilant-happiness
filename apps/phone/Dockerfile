# TODO-ER phone app — built static, served by nginx. Build context is the repo root.
FROM node:22-slim AS build

RUN npm install -g pnpm@10.29.3

WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm --filter @todoer/phone build

FROM nginx:alpine
COPY apps/phone/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/phone/dist /usr/share/nginx/html
EXPOSE 80
