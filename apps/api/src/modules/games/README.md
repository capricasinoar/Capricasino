# Módulo games (Semana 4) — catálogo agnóstico al proveedor

Sirve el catálogo desde la DB con la **misma forma que entregaría un agregador**, y lanza juegos despachando al adapter del proveedor. Es la costura del agregador (🧩 COSTURA-REAL #3): el día de la licencia, integrar Realist Gaming / Hub88 es **un seed de catálogo + un adapter**, sin tocar este módulo, ni el wallet, ni el lobby.

## Endpoints

| Endpoint | Auth | Descripción |
|---|---|---|
| `GET /api/v1/games?category=&provider=&search=&cursor=` | público | Catálogo paginado. Cada juego trae `provider`, `providerName`, `type`, `rtp`, `volatility`, `categories`, `isFeatured`, `playable` |
| `GET /api/v1/games/categories` | público | Categorías con conteo de juegos |
| `POST /api/v1/games/launch` | jugador | Abre `game_session` y despacha al adapter del proveedor del juego |

## Agnosticismo

- `playable` se deriva de `ProviderRegistry.has(providerCode)` — hoy solo `sim` tiene adapter (Capri Dice). El resto del catálogo (Capri Studios, Capri Live) aparece como "próximamente".
- `launch` resuelve el adapter con `ProviderRegistry.get(game.provider.code)`. No conoce proveedores concretos.
- **Enchufar un agregador** = (1) `providers` row + `games` rows (seed/import) + (2) un adapter implementando `GameProviderPort` registrado en `ProviderRegistry`. Nada más cambia.

## Frontend

El lobby (`apps/web`) consume `GET /games` y `/games/categories`. El look (icono SVG + gradiente) se decide en el cliente por slug/tipo; un agregador real traería `thumbnail_url` (imagen).
