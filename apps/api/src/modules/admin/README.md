# Módulo admin (Semana 9)

Endpoints del panel de administración, bajo `/admin/v1/*` (fuera de `/api/v1`). Auth **totalmente separada** de la de jugadores (Cap. 6.3, Cap. 10): tabla `admin_users`, secret JWT propio (`ADMIN_JWT_SECRET`), guard propio con RBAC.

## Endpoints

| Endpoint | Rol | Descripción |
|---|---|---|
| `POST /admin/v1/auth/login` | — | Login de admin → JWT de 1 h |
| `GET /admin/v1/me` | admin | Datos del admin autenticado |
| `GET /admin/v1/dashboard` | admin | KPIs: clientes, saldo en circulación, GGR, apostado, premios, cargas/retiradas, sesiones abiertas |
| `GET /admin/v1/users?search=` | admin | Lista de clientes con saldo (busca por email/username) |
| `GET /admin/v1/users/:id` | admin | Ficha: saldo + ledger de las últimas 50 transacciones + sesiones |
| `POST /admin/v1/users/:id/adjust` | finance / super_admin | Cargar o retirar saldo → wallet + recibo + auditoría |
| `GET /admin/v1/audit-logs` | admin | Registro de acciones sensibles |

## Seguridad

- Un admin NO es un player con flag: otra tabla, otro ciclo de vida, otro token (`kind: "admin"`).
- RBAC con `@Roles(...)`; `super_admin` pasa siempre. Cargar/retirar exige `finance` o `super_admin`.
- Cargas/retiradas van por `PaymentsService` (wallet → asiento auditado), nunca `UPDATE` directo.
- Toda acción sensible queda en `audit_logs` (quién, qué, antes/después).

## 🧩 Pendiente (hardening S10)

2FA TOTP **obligatorio** para admins, restricción por IP, subdominio propio. Hoy: login por contraseña Argon2id. Fijar/cambiar contraseña de admin: `pnpm admin-passwd <email> <contraseña> [rol]`.

## App web

`apps/admin` (Next.js, puerto 3001). Login → resumen → clientes → ficha con carga/retirada → auditoría.
