# Multi-stage: build → runtime mínimo (Cap. 13.1)
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate
RUN pnpm --filter @capri/contracts build && pnpm --filter @capri/api build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
COPY --from=build /repo/prisma ./prisma
EXPOSE 4000
# Arranque: (1) aplica migraciones ya versionadas (migrate deploy es seguro en
# prod: no genera esquemas ni pide input), (2) siembra catálogo + admin (seed
# idempotente con upserts; no pisa datos existentes; no bloquea si falla),
# (3) arranca la API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && (node_modules/.bin/tsx prisma/seed.ts || echo 'seed omitido') && node dist/main.js"]
