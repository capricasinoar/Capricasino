# Módulo auth (Semana 1)

Registro, login, sesiones y protección de endpoints. Contratos en `@capri/contracts` (Cap. 7.1).

## Contrato

| Endpoint | Auth | Descripción |
|---|---|---|
| `POST /api/v1/auth/register` | — | Crea user + wallet (a 0 FUN) en una transacción. 409 genérico si email/username existen |
| `POST /api/v1/auth/login` | — | Access JWT (15 min) en body + refresh opaco (30 días) en cookie `capri_rt` httpOnly/SameSite=Strict |
| `POST /api/v1/auth/refresh` | cookie | **Rotación**: revoca el token usado y emite otro. Reuso de un token revocado → revoca todas las sesiones del usuario |
| `POST /api/v1/auth/logout` | cookie | Revoca la sesión y limpia la cookie |
| `GET /api/v1/auth/me` | Bearer | Mínimo para probar `JwtAuthGuard` |

## Invariantes

- Passwords con **Argon2id**; en DB solo el hash.
- El refresh token **nunca** viaja en el body ni se guarda en claro: en `sessions` vive su SHA-256.
- Respuestas de login/registro **no revelan** si un email existe (Cap. 8.4).
- El `user_id` de cualquier operación sale del JWT verificado, jamás del cliente (TRAMPA #10, IDOR).
- El saldo de bienvenida NO se acredita aquí: eso es del Wallet Service (S2) vía ledger.

## Pendiente (más adelante en el roadmap)

2FA TOTP (opcional user, obligatorio admin), rate limiting por IP/cuenta en login (S10), rotación de claves JWT con `kid` (S10).

## Tests

`pnpm --filter @capri/api test` — integración contra Postgres real (levanta `docker compose` antes). Si la DB no está disponible, la suite se omite.
