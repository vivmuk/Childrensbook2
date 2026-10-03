# syntax=docker/dockerfile:1.7

# No ARG/ENV is used for secrets anywhere in this file. VENICE_API_KEY and any
# other credentials are read from process.env at request time, so they are
# supplied by the platform at run time and never baked into an image layer.

FROM node:20-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1

# ---------------------------------------------------------------------------
# deps: full dependency tree (including devDependencies) used to build the app
# ---------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
# ca-certificates only: there is no native module to compile any more, so the
# python3/make/g++ toolchain that better-sqlite3 needed is gone.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

# ---------------------------------------------------------------------------
# prod-deps: runtime-only dependency tree
# ---------------------------------------------------------------------------
FROM deps AS prod-deps
WORKDIR /app
RUN npm prune --omit=dev

# ---------------------------------------------------------------------------
# builder: next build
# ---------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---------------------------------------------------------------------------
# runner: final image
# ---------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

# Chromium and the fonts Puppeteer needs to render PDFs.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
     ca-certificates \
     chromium \
     fonts-dejavu-core \
     fonts-liberation \
  && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/data ./data
COPY package.json next.config.js ./

# The app writes its SQLite database and data files under /app/data.
RUN chown -R node:node /app/data
USER node

EXPOSE 3000
CMD ["npm", "start"]
