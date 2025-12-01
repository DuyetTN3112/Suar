# syntax=docker/dockerfile:1

# 1. BASE - Môi trường Node.js
FROM node:20-alpine AS base
ENV NODE_ENV=production
# Cài đặt dumb-init để quản lý process
RUN apk add --no-cache dumb-init

# 2. DEPS - Cài đặt thư viện
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
# Cài dependencies (dùng cache để nhanh hơn)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --include=dev

# 3. BUILDER - Build Code & React
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Build Backend (Adonis)
RUN node ace build --ignore-ts-errors
# Build Frontend (React/Vite)
RUN npx vite build
# Xóa thư viện thừa, chỉ giữ lại cái cần chạy
RUN npm ci --omit=dev && npm cache clean --force

# 4. RUNNER - Image cuối cùng để chạy
FROM base AS runner
WORKDIR /app
COPY --from=base /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=builder --chown=node:node /app/build ./build
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./
COPY --chown=node:node ./docker-entrypoint.sh /usr/local/bin/

RUN chmod +x /usr/local/bin/docker-entrypoint.sh
USER node
EXPOSE 3333
ENV PORT=3333
ENV HOST=0.0.0.0

ENTRYPOINT ["/usr/bin/dumb-init", "--", "/usr/local/bin/docker-entrypoint.sh"]
