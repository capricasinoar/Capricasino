# ADR 0001 — Monolito modular y stack base

**Fecha:** 2026-07-13 · **Estado:** aceptado

## Contexto

Plataforma de casino play money mantenida principalmente con Claude Code por un equipo de una persona. El saldo exige consistencia fuerte (transacciones ACID); los microservicios convertirían cada apuesta en una saga distribuida.

## Decisión

1. **Monolito modular** en NestJS (adaptador Fastify): un deploy, módulos con fronteras estrictas (auth, wallet, games, provider, bonus, payments, realtime, admin). Wallet y registro de apuesta viven en el mismo servicio y la misma transacción de DB.
2. **Ports & Adapters** para las cinco costuras a dinero real (PSP, KYC, proveedor, juego responsable, reporting): hoy adapters fake/simulados, mañana reales, sin tocar el núcleo.
3. **PostgreSQL** como única fuente de verdad del saldo (ledger doble entrada, append-only). Redis solo cache/colas/pubsub.
4. **Next.js 15 App Router** para el frontend jugador (SEO en páginas públicas + streaming UI).
5. **Monorepo pnpm + Turborepo** con `packages/contracts` (Zod) compartido: un cambio de contrato rompe en compile-time, no en producción.

## Consecuencias

- El candidato natural a extraerse a servicio aparte más adelante es el provider engine (real-time pesado); las fronteras ya lo permiten.
- Prisma para el 95% del CRUD; el motor de wallet usa transacciones con aislamiento explícito y SQL crudo donde haga falta (`SELECT ... FOR UPDATE`).
