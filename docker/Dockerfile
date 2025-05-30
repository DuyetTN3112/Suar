# syntax=docker/dockerfile:1

# ==============================================================================
# Dockerfile ULTRA OPTIMIZED cho Suar
# Mục tiêu: Image size < 500MB (production chỉ cần ~200-400MB)
# ==============================================================================

# 1. BASE - Node 22 Alpine (siêu nhẹ ~50MB)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@latest --activate

# 2. DEPS - Chỉ cài production dependencies
FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml ./

# Cache mount giúp rebuild nhanh hơn
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile --prod=false

# 3. BUILDER - Build app
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build và prune ngay trong cùng layer để giảm size
RUN pnpm run build && \
    pnpm prune --prod && \
    rm -rf .git .github docs tests *.md

# 4. RUNNER - Production image cực nhẹ
FROM node:22-alpine AS runner
# Chỉ cài dumb-init, không cần wget (healthcheck dùng node)
RUN apk add --no-cache dumb-init && \
    addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs nodejs

WORKDIR /app

# Copy chỉ những thứ cần thiết
COPY --from=builder --chown=nodejs:nodejs /app/build ./build
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./

USER nodejs
EXPOSE 3333

ENV PORT=3333
ENV HOST=0.0.0.0
ENV NODE_ENV=production

# Healthcheck dùng node thay vì wget (đã có sẵn)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3333/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1))"

ENTRYPOINT ["/usr/bin/dumb-init", "--"]
CMD ["node", "build/bin/server.js"]

# ==============================================================================
# DỰ KIẾN KÍCH THƯỚC:
# - Base Alpine: ~50MB
# - Node.js: ~80MB  
# - node_modules (prod): ~200-300MB
# - Build output: ~30-50MB
# - TỔNG: ~400-500MB (có thể ít hơn nếu ít dependencies)
#
# SO SÁNH:
# - node:20 (full): ~1GB
# - node:20-slim: ~200MB
# - node:22-alpine: ~130MB ✓
# ==============================================================================
