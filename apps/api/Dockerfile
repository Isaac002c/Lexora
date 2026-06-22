FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN npm install --global pnpm@10.34.3
WORKDIR /app

FROM base AS dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/auth/package.json packages/auth/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/database/package.json packages/database/package.json
RUN pnpm install --frozen-lockfile

FROM dependencies AS builder
COPY . .
RUN pnpm db:generate && pnpm --filter @chronostek/api build

FROM builder AS migrator
CMD ["pnpm", "--filter", "@chronostek/database", "prisma:deploy"]

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S chronostek && adduser -S chronostek -G chronostek && mkdir -p /data/uploads && chown -R chronostek:chronostek /data
COPY --from=builder --chown=chronostek:chronostek /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=chronostek:chronostek /app/node_modules ./node_modules
COPY --from=builder --chown=chronostek:chronostek /app/apps/api/node_modules ./apps/api/node_modules
USER chronostek
EXPOSE 3333
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:3333/health').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "apps/api/dist/server.js"]
