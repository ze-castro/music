FROM --platform=$BUILDPLATFORM oven/bun:1 AS build
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Runtime deps only. adapter-node leaves package.json `dependencies` as external imports,
# so the server needs them in node_modules. All pure JS, so resolving on the build
# platform is safe and avoids running bun install under QEMU for arm64.
FROM --platform=$BUILDPLATFORM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

FROM oven/bun:1-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0 \
    DATABASE_URL=/data/music.db MIGRATIONS_DIR=/app/drizzle
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/build ./build
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/package.json ./
VOLUME /data
EXPOSE 3000
CMD ["bun", "./build/index.js"]
