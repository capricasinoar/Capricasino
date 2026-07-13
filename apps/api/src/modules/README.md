# Módulos del monolito modular

Cada módulo es una rebanada vertical (controller · service · dto · ports · tests · README) y **solo** se comunica con otros módulos vía sus puertos. Plantilla mínima: `health/`.

| Módulo | Semana | Contenido previsto (docs/architecture.md) |
|---|---|---|
| `health` | 0 ✅ | Liveness/readiness |
| `auth` | 1 ✅ | Registro, login, JWT corto + refresh rotativo (cookie httpOnly), sesiones revocables. Pendiente: RBAC admin, 2FA, rate limit (S9-S10) |
| `wallet` | 2 | **El núcleo.** Ledger doble entrada, idempotencia (`provider_tx_id` UNIQUE), `FOR UPDATE`, CHECK saldo≥0, buckets cash/bonus. TDD con tests de concurrencia |
| `provider` | 3 | Puerto `GameProviderPort` + adapter `sim` (callbacks HMAC, launch, rondas, reconciliación). El "modo caos" vive en `packages/provider-sim` |
| `games` | 4 | Catálogo, categorías, favoritos, recientes, launch |
| `realtime` | 6 | WS Gateway (Socket.IO), saldo en vivo, rooms `user:{id}`, Redis adapter |
| `bonus` | 7 | Campañas, wagering con contribución por juego, free spins, VIP, cashback |
| `payments` | 8 | 🧩 Depósito/retiro FAKE detrás de un puerto PSP listo para dinero real |
| `kyc` | 8 | 🧩 Stub (tablas ya presentes en el esquema) |
| `admin` | 9 | Auth separada, KPIs, ledger por usuario, ajustes auditados, cola de retiros |

Regla de oro: **todo lo que toca saldo pasa por `wallet/ports/wallet.port.ts`** y queda en el ledger.
