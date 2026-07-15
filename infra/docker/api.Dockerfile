# Imagen de la API. Un solo stage: instala, genera Prisma Client, compila y
# arranca desde el MISMO árbol instalado. Copiar el repo entero (en vez de solo
# node_modules) mantiene íntegros los enlaces a los paquetes de workspace
# (@capri/contracts) — la fuente del fallo "Cannot find module" con pnpm.
# NODE_ENV lo inyecta el host en runtime (Railway); no se fija aquí para que
# pnpm install incluya las devDeps que necesitan migrate (prisma) y seed (tsx).
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm exec prisma generate
RUN pnpm --filter @capri/contracts build && pnpm --filter @capri/api build
EXPOSE 4000
# Arranque: migraciones (seguro en prod) + seed idempotente (no bloquea) + API.
CMD ["sh", "-c", "node_modules/.bin/prisma migrate deploy --schema prisma/schema.prisma && (node_modules/.bin/tsx prisma/seed.ts || echo 'seed omitido') && node apps/api/dist/main.js"]
