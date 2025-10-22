# Multi-stage Dockerfile for production deployment
# Uses pnpm + tsup to build, then runs Fastify via fastify-cli

# 1) Install dependencies (including dev) using pnpm
FROM node:20-slim AS deps
WORKDIR /app
# Enable Corepack to use pnpm that matches the lockfile
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# 2) Build the TypeScript project with tsup
FROM deps AS build
COPY tsconfig.json tsup.config.ts ./
COPY src ./src
# Copy any files needed at build-time (schemas, configs, etc.)
COPY drizzle ./drizzle
RUN pnpm run build

# 3) Prune dev dependencies for a smaller runtime image
FROM deps AS prod-deps
RUN pnpm prune --prod

# 4) Final runtime image
FROM node:20-slim AS runner
ENV NODE_ENV=production
# Ensure Fastify listens on all interfaces inside the container
ENV FASTIFY_ADDRESS=0.0.0.0
WORKDIR /app

# Copy production node_modules and app build artifacts
COPY --from=prod-deps /app/node_modules ./node_modules
COPY package.json ./package.json
COPY --from=build /app/dist ./dist
COPY --from=build /app/drizzle ./drizzle

# Use non-root user provided by the Node image
USER node

# Expose a default app port (documentation only; runtime can override via PORT)
EXPOSE 8000

# Start Fastify using the built plugin entry at dist/app.js
# Use PORT env if provided (fallback 8000) and bind to 0.0.0.0 for container networking
CMD ["sh", "-lc", "node_modules/.bin/fastify start -l info -a 0.0.0.0 -p ${PORT:-8000} dist/app.js"]

