# Multi-stage: build → runtime mínimo (Cap. 13.1)
FROM node:22-alpine AS build
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @capri/contracts build && pnpm --filter @capri/api build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/package.json ./package.json
COPY --from=build /repo/node_modules ./node_modules
COPY --from=build /repo/packages ./packages
EXPOSE 4000
CMD ["node", "dist/main.js"]
