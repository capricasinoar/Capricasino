# Módulo wallet (Semana 2) — el núcleo económico

Única puerta al saldo. Nadie hace `UPDATE wallets` fuera de `WalletService`. Especificación: `docs/architecture.md` Cap. 5.

## Operaciones

| Método | Tipo | Ledger (debit → credit) |
|---|---|---|
| `deposit` | carga manual | `house:deposits` → `player:X:cash` |
| `withdraw` | retirada manual | `player:X:cash` → `house:deposits` |
| `debit` | apuesta (bet) | `player:X:cash` → `house:wagering` |
| `credit` | premio (win) | `house:wagering` → `player:X:cash` |
| `rollback` | reversión | asientos inversos del original (append-only) |

## Invariantes (verificadas por tests)

1. **Doble entrada:** cada transacción escribe asientos que suman cero; se valida antes del COMMIT.
2. **Idempotencia atómica:** UNIQUE `(provider_id, provider_tx_id)`; un reintento devuelve la respuesta original (`balanceAfter` guardado) sin mover saldo. Nunca check-then-insert.
3. **Concurrencia:** `SELECT ... FOR UPDATE` + update condicional + CHECK `>= 0` en DB (triple defensa). 30 bets concurrentes con fondos para 25 → pasan exactamente 25.
4. **Append-only:** las reversiones escriben asientos inversos; jamás se edita/borra un asiento.
5. **Saldo derivable:** `recomputeFromLedger()` debe coincidir siempre con el saldo materializado.
6. Deadlocks/conflictos de serialización → retry automático con backoff (3 intentos).

## Endpoints del jugador

`GET /api/v1/wallet/balance` · `GET /api/v1/wallet/transactions?cursor&limit` (Bearer; el userId sale del token).

## Cargas/retiradas del operador

Vía `PaymentsService` (módulo payments) + CLI: `pnpm admin deposit|withdraw|balance|history <email> [FUN] [razón]`.
Cada movimiento deja **triple registro**: ledger + `payment_transactions` + `audit_logs`.

## Pendiente

Bucket bonus con wagering (S7), callbacks HTTP del proveedor con HMAC (S3), conciliación programada ledger↔saldo (S11).
