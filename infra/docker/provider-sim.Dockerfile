# Imagen del proveedor simulado. Mismo enfoque que la API: un solo stage que
# instala, compila y arranca desde el árbol instalado (enlaces de workspace
# íntegros). NODE_ENV lo inyecta el host en runtime.
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@10.0.0 --activate
WORKDIR /repo
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @capri/provider-sim build
EXPOSE 4100
CMD ["node", "packages/provider-sim/dist/index.js"]
