# CAPRI CASINO — Reglas del proyecto (Claude Code)

Plataforma de casino online **play money** (dinero 100% ficticio, moneda `FUN`).
Arquitectura de referencia: `docs/architecture.md` (leerlo antes de tocar wallet/provider).

## Stack

- Monorepo: pnpm workspaces + Turborepo
- Frontend jugador: `apps/web` — Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4
- Backend: `apps/api` — NestJS 11 sobre adaptador Fastify + TypeScript
- DB: PostgreSQL 16+ vía Prisma (`prisma/schema.prisma` en la raíz)
- Cache/colas: Redis 7+ (BullMQ)
- Contratos compartidos: `packages/contracts` (Zod + tipos, fuente de verdad de las APIs)

## Reglas inviolables

1. **Dinero siempre `BigInt` en unidad mínima** (centavos de FUN). Jamás `Float`/`Number` para saldos.
2. **Nadie escribe saldo salvo el Wallet Service.** Ningún módulo hace `UPDATE wallets` por fuera.
3. **Ledger append-only.** `ledger_entries`, `audit_logs` y `events` nunca se editan ni borran. Correcciones = asiento de reversión.
4. **Toda operación de saldo es idempotente y atómica:** `provider_tx_id` UNIQUE + `SELECT ... FOR UPDATE` + update condicional + asientos, todo en UNA transacción de DB.
5. **Doble entrada:** los asientos de cada transacción suman cero. Se valida antes del COMMIT.
6. **El resultado del juego nunca lo decide el cliente.** Solo callbacks server-to-server firmados (HMAC, `timingSafeEqual`) mueven saldo.
7. **Secretos nunca en el repo** ni en logs. `.env` está en `.gitignore`; en producción, secret manager.
8. **Ningún módulo toca las tablas de otro módulo.** Comunicación solo vía interfaces públicas (puertos).
9. **Timestamps `timestamptz` en UTC.** Conversión solo en presentación.
10. Las 🧩 COSTURAS-REAL (PSP, KYC, proveedor certificado, juego responsable, reporting) se implementan como **puertos con adapters fake**. No mezclar lógica real/fake fuera del adapter.

## Convenciones

- Un módulo NestJS = rebanada vertical: `controller`, `service`, `dto/`, `ports/`, tests, `README.md`. Misma forma siempre (ver `apps/api/src/modules/health` como plantilla mínima).
- Validación de entrada con Zod, esquemas importados de `@capri/contracts`.
- Errores API: `{ error: { code, message, details } }`.
- Frontend: componentes en `src/components`, datos mock en `src/lib`. Copy en **español**. Tema oscuro por defecto (tokens en `globals.css`).
- **No usar meta tags de Twitter Cards** (twitter:card etc.) — decisión del propietario.
- Un módulo está "hecho" cuando: tiene tests (con concurrencia si toca saldo), README, y pasa `pnpm lint` + `pnpm typecheck` + build.

## Cómo correr

```bash
pnpm install
pnpm web        # frontend en http://localhost:3000
pnpm api        # backend en http://localhost:4000 (health: /api/v1/health)
pnpm build      # build de todo el monorepo
docker compose -f infra/docker/docker-compose.yml up   # stack completo (requiere Docker)
```

## Trampas a evitar (checklist del Cap. 12 de docs/architecture.md)

Doble débito (idempotencia), saldo negativo (FOR UPDATE + CHECK), Redis como fuente de verdad (jamás), dinero en float, WS como fuente de verdad, check-then-insert no atómico, borrar asientos del ledger, admins como users con flag.

## Roadmap

Semana a semana en `docs/architecture.md` Cap. 15. Estado actual: **Semana 0 (fundaciones) + landing/lobby demo**. Siguiente: Semana 1 (auth) → Semana 2 (wallet + ledger, TDD obligatorio).
