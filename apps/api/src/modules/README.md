# Módulos del monolito modular

Cada módulo es una rebanada vertical (controller · service · dto · ports · tests · README) y **solo** se comunica con otros módulos vía sus puertos. Plantilla mínima: `health/`.

| Módulo | Semana | Contenido previsto (docs/architecture.md) |
|---|---|---|
| `health` | 0 ✅ | Liveness/readiness |
| `auth` | 1 ✅ | Registro, login, JWT corto + refresh rotativo (cookie httpOnly), sesiones revocables. Pendiente: RBAC admin, 2FA, rate limit (S9-S10) |
| `wallet` | 2 ✅ | **El núcleo.** Ledger doble entrada, idempotencia (`provider_tx_id` UNIQUE), `FOR UPDATE`, CHECK saldo≥0, rollback append-only. 10 tests de concurrencia/idempotencia. Pendiente: bucket bonus (S7) |
| `provider` | 3 ✅ | Callback HMAC (bet/win/rollback/balance), rondas, idempotencia, fuera-de-orden. 11 tests de resiliencia incl. modo caos. Adapter `sim` + puerto `GameProviderPort` |
| `games` | 4 (parcial ✅) | `POST /games/launch` abre sesión y pide la URL al provider-sim. Pendiente: catálogo, categorías, favoritos, recientes |
| `realtime` | 6 | WS Gateway (Socket.IO), saldo en vivo, rooms `user:{id}`, Redis adapter |
| `bonus` | 7 | Campañas, wagering con contribución por juego, free spins, VIP, cashback |
| `payments` | 8 (parcial ✅) | 🧩 Cargas/retiradas MANUALES del operador con triple registro (ledger + recibo + auditoría) vía CLI `pnpm admin`. Pendiente: endpoints jugador + cola de aprobación (S8-S9) |
| `kyc` | 8 | 🧩 Stub (tablas ya presentes en el esquema) |
| `admin` | 9 | Auth separada, KPIs, ledger por usuario, ajustes auditados, cola de retiros |

Regla de oro: **todo lo que toca saldo pasa por `wallet/ports/wallet.port.ts`** y queda en el ledger.
