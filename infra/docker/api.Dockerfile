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
# Aplica migraciones pendientes y arranca. migrate deploy NO genera esquemas
# nuevos ni pide input: solo aplica las migraciones ya versionadas (seguro en prod).
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && node dist/main.js"]
