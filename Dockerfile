# Use a specific, compatible Node version
FROM node:22.12.0-slim AS base

# Install openssl and other prisma dependencies
RUN apt-get update && apt-get install -y openssl libssl-dev

WORKDIR /app

# Enable Corepack for pnpm
RUN npm install -g corepack@0.24.1 && corepack enable

COPY package.json pnpm-lock.yaml ./

# SET THE FLAG HERE - This is the crucial part for the install phase
ENV PRISMA_SKIP_POSTINSTALL_GENERATE=true

# Install dependencies
RUN pnpm i --frozen-lockfile

COPY . .

# Generate Prisma client manually now that install is finished
RUN pnpm prisma generate

# Build the NestJS app
RUN pnpm build

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["docker-entrypoint.sh"]
