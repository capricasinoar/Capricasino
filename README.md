# CAPRI CASINO

Plataforma de casino online **play money** (dinero 100% ficticio, moneda `FUN`). Monorepo pnpm + Turborepo.

> Arquitectura completa: [`docs/architecture.md`](docs/architecture.md) · Reglas para IA: [`CLAUDE.md`](CLAUDE.md)

## Estructura

```
apps/
  web/        Next.js 15 — landing pública + lobby demo (español, tema oscuro)
  api/        NestJS 11 (Fastify) — monolito modular (auth·wallet·games·provider·bonus·…)
packages/
  contracts/  Tipos + esquemas Zod compartidos front/back
  config/     tsconfig base compartido
prisma/       Esquema completo de la DB (PostgreSQL) + seed
infra/docker/ docker-compose del stack (postgres, redis, api, web)
docs/         Arquitectura + ADRs
```

## Arrancar

```bash
pnpm install

pnpm web    # frontend → http://localhost:3000  (landing) y /casino (lobby demo)
pnpm api    # backend  → http://localhost:4000/api/v1/health

pnpm build  # build completo del monorepo
```

Con Docker (stack completo, incluye Postgres y Redis):

```bash
docker compose -f infra/docker/docker-compose.yml up
```

## Estado del roadmap (Cap. 15 de la arquitectura)

- ✅ **Semana 0 — Fundaciones:** monorepo, configs, esquema Prisma, docker-compose, CI, CLAUDE.md
- ✅ **Extra:** landing pública + lobby demo con catálogo mock
- ✅ **Semana 1 — Auth + usuarios:** registro, login, JWT + refresh rotativo con detección de reuso, 8 tests de integración
- ✅ **Semana 2 — Wallet + Ledger:** doble entrada, idempotencia, FOR UPDATE + CHECK, rollback append-only, cargas/retiradas manuales con triple registro y CLI de operador (`pnpm admin`). 13 tests nuevos
- ✅ **Semana 3 — Provider-sim + Dice jugable:** proveedor simulado con protocolo seamless-wallet HMAC, RNG provably fair, callbacks bet/win/rollback, modo caos. Capri Dice apuesta de verdad contra el wallet desde el navegador. 11 tests de resiliencia (32 total)
- ⏳ Semana 3 — Provider-sim + callbacks HMAC + modo caos
- ⏳ Semanas 4–12 — catálogo real, real-time, bonos, pagos fake, admin, seguridad, deploy

## Aviso

CAPRI CASINO es una plataforma de entretenimiento con dinero ficticio. **No se apuesta ni se gana dinero real.**
