# Módulo responsible (Juego responsable — 🧩 COSTURA-REAL #4, Cap. 0)

Controles de juego responsable: **límites diarios** y **autoexclusión**, con enforcement real. Obligatorio en toda jurisdicción seria; adelantarlo acorta el camino a la licencia.

## Controles

| Control | Enforcement |
|---|---|
| Autoexclusión (24h / 7d / 30d / permanente) | `games/launch` bloquea con `403 SELF_EXCLUDED`; la cuenta pasa a `self_excluded` |
| Límite de apuesta diaria (`daily_wager`) | El bet del proveedor se rechaza (`LIMIT_REACHED`) si el apostado del día + la apuesta supera el tope |
| Límite de pérdida diaria (`daily_loss`) | El bet se rechaza si la pérdida neta del día ya alcanzó el tope |

Ventana = día UTC en curso, calculada desde `transactions`.

## Endpoints del jugador (`/api/v1/responsible-gaming`)

`GET status` · `PUT limits` · `DELETE limits/:kind` · `POST self-exclude`. Son del propio jugador — no mueven dinero, así que no chocan con la regla "solo el operador carga/retira".

## Endpoints admin

`GET /admin/v1/users/:id/responsible-gaming`, `POST .../exclude`, `POST .../lift-exclusion` (rol support/risk). El operador puede excluir o reactivar a un cliente.

## 🧩 De "básico" a "full" con licencia

Hoy: límites + autoexclusión. Con licencia se amplía a reality checks obligatorios y reportes al regulador — **sin mover los puntos de enforcement** (launch y bet).
