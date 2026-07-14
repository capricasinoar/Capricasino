# Módulo notifications (Centro de notificaciones — Cap. 7.7, UX.3)

Feed de notificaciones del jugador, empujadas en vivo por WebSocket.

## Endpoints (jugador)

| Endpoint | Descripción |
|---|---|
| `GET /api/v1/notifications?cursor` | Lista paginada + `unread` (nº sin leer) |
| `POST /api/v1/notifications/read` `{ids}` | Marca leídas (filtra por userId, anti-IDOR) |
| `POST /api/v1/notifications/read-all` | Marca todas leídas |

## Quién crea notificaciones

- **payments** (carga/retiro manual del operador) → tipo `deposit` / `withdrawal` con `{amount, reason, balanceAfter}`.
- **auth** (registro) → tipo `welcome`.
- Fácil de extender: `NotificationsService.create(userId, type, payload)`.

## Tiempo real

Cada alta emite `notification.created`; el `RealtimeGateway` empuja `{unread}` a la sala `user:{id}`. El cliente actualiza el badge de la campana y refresca el listado al abrirlo. Al reconectar, resync del contador por REST (el WS avisa, la DB manda — TRAMPA #11).

## Render

El backend guarda `type` + `payload`; el texto se compone en el cliente (`notifications-bell.tsx`) para mantener el copy (español) fuera de la DB.
