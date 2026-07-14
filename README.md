# CAPRI CASINO

Plataforma de casino online **play money** (dinero 100% ficticio, moneda `FUN`). Monorepo pnpm + Turborepo.

> Arquitectura completa: [`docs/architecture.md`](docs/architecture.md) · Reglas para IA: [`CLAUDE.md`](CLAUDE.md)

## Estructura

```
apps/
  web/        Next.js 15 — landing pública + lobby (juega Capri Dice) · puerto 3000
  admin/      Next.js 15 — panel de administración (auth separada) · puerto 3001
  api/        NestJS 11 (Fastify) — monolito modular (auth·wallet·provider·admin·…) · puerto 4000
packages/
  contracts/     Tipos + esquemas Zod compartidos front/back
  provider-sim/  Proveedor de juegos simulado (Capri Dice) · puerto 4100
  config/        tsconfig base compartido
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
- ✅ **Panel de administración (adelantado de S9):** `apps/admin` con auth separada, dashboard (KPIs, GGR), lista de clientes, ficha con ledger completo, carga/retirada auditada, visor de auditoría
- ✅ **Semana 4 — Catálogo agnóstico de proveedor:** catálogo servido desde la DB con forma de agregador (`GET /games`), `ProviderRegistry` que despacha el launch por proveedor, `playable` derivado del registro. Lobby consumiendo la API. Costura lista para enchufar un agregador (Realist/Hub88) como seed + adapter
- ✅ **Semana 6 — Saldo en tiempo real:** WebSocket (Socket.IO) con auth JWT, el saldo se actualiza solo tras cada apuesta/premio (evento `balance.changed`), resync REST al reconectar. La cabecera destella al cambiar
- ✅ **Juego responsable + reporting (costuras #4 y #5):** límites diarios (apuesta/pérdida) y autoexclusión con enforcement real en launch y bet; panel de juego responsable para el jugador; reportes de GGR por día y actividad por cliente con exportación CSV en el admin, más excluir/reactivar clientes. 6 tests nuevos (38 total)
- ✅ **Hardening de seguridad (Cap. 8):** 2FA (TOTP) para el admin con secreto cifrado (AES-GCM), rate limiting (login/registro estrictos, callbacks eximidos), cabeceras de seguridad (CSP/HSTS/anti-clickjacking vía helmet + headers en Next), y guardia que aborta el arranque en producción con secretos de desarrollo. 7 tests nuevos (45 total)
- ⏳ Siguiente — historial de transacciones/notificaciones para el jugador, o despliegue/observabilidad

## Acceso al panel de administración

App en `apps/admin` (puerto 3001). Arrancar: `pnpm admin-web`. Crear/cambiar contraseña de un admin:

```bash
pnpm admin-passwd owner@capri.local "tu-contraseña" super_admin
```

Desde el panel: resumen con KPIs, buscar clientes, ver su ledger completo y **cargar/retirar saldo** (queda en ledger + recibo + auditoría). La CLI `pnpm admin` sigue disponible como alternativa.
- ⏳ Semanas 4–12 — catálogo real, real-time, bonos, pagos fake, admin, seguridad, deploy

## Aviso

CAPRI CASINO es una plataforma de entretenimiento con dinero ficticio. **No se apuesta ni se gana dinero real.**
