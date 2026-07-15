# Despliegue de CAPRI CASINO

## Topología

Vercel es serverless: aloja de maravilla las webs Next.js, pero **no** el backend
(NestJS con WebSockets y conexiones persistentes). El reparto:

```
   Jugadores ─────► web (Vercel, Next.js)     ┐
   Operador ──────► admin (Vercel, Next.js)   ├─► API (host de contenedores)
                                              ┘        │   │
                                    provider-sim ◄─────┘   ├─► PostgreSQL (Neon)
                                    (host de contenedores) └─► (Redis: futuro)
```

- **Vercel:** 2 proyectos → `apps/web` y `apps/admin`.
- **Host de contenedores** (Railway, Render o Fly.io) → `apps/api` y `packages/provider-sim` (Docker).
- **PostgreSQL gestionado:** Neon o Supabase (plan gratis sobra para empezar).
- **Redis:** aún no se usa en el código (throttler y WS van en memoria); se añade al escalar a >1 instancia.

---

## 1. PostgreSQL (Neon)

1. Crea un proyecto en https://neon.tech y copia la **connection string** (`postgresql://…`).
2. Guárdala como `DATABASE_URL` (la usará la API). Las migraciones se aplican solas al arrancar la API (`prisma migrate deploy` en el Dockerfile).

## 2. API + provider-sim (Railway, recomendado)

En https://railway.app, desde tu repo de GitHub, crea **dos servicios**:

**Servicio `api`** — Dockerfile: `infra/docker/api.Dockerfile`. Variables:
```
NODE_ENV=production
DATABASE_URL=<Neon>
JWT_SECRET=<aleatorio largo>
ADMIN_JWT_SECRET=<aleatorio largo, distinto>
ADMIN_TOTP_KEY=<aleatorio largo, distinto>
PROVIDER_SIM_SECRET=<aleatorio largo, compartido con provider-sim>
PROVIDER_SIM_URL=https://<url-publica-provider-sim>
WEB_ORIGIN=https://<tu-web>.vercel.app
ADMIN_ORIGIN=https://<tu-admin>.vercel.app
PORT=4000
```
> El arranque **aborta** si algún secreto sigue con el valor de desarrollo (guardia del Cap. 8.7). Genera cada secreto con `openssl rand -hex 32`.

**Servicio `provider-sim`** — Dockerfile: `infra/docker/provider-sim.Dockerfile`. Variables:
```
SIM_PORT=4100
SIM_PUBLIC_URL=https://<url-publica-provider-sim>
OPERATOR_CALLBACK_URL=https://<url-publica-api>/provider/v1/callback
PROVIDER_SIM_SECRET=<el mismo que en api>
```

Tras el primer despliegue de la API, crea tu admin (una vez):
```
railway run --service api node_modules/.bin/tsx apps/api/src/cli/set-admin-password.ts owner@tu-dominio.com "TU-CONTRASEÑA" super_admin
```
(o ejecútalo contra la `DATABASE_URL` desde tu máquina).

## 3. Web + admin (Vercel)

Crea **dos proyectos** en Vercel importando el mismo repo:

| Proyecto | Root Directory | Variable de entorno |
|---|---|---|
| capri-web | `apps/web` | `NEXT_PUBLIC_API_URL = https://<api>/api/v1` |
| capri-admin | `apps/admin` | `NEXT_PUBLIC_API_URL = https://<api>` (sin `/api/v1`) |

El `vercel.json` de cada app ya fija el install/build vía Turborepo (compila también `@capri/contracts`). Vercel detecta Next.js automáticamente.

## 4. Comprobaciones post-deploy

- `https://<api>/api/v1/health` → `{"status":"ok"}` (liveness).
- `https://<api>/api/v1/ready` → `postgres: ok` (readiness; el balanceador usa esto).
- `https://<api>/metrics` → métricas Prometheus (restringir por red al scraper).
- Entra en la web con un cliente que crees desde el panel admin.

## 5. Observabilidad

- **Métricas:** `/metrics` en formato Prometheus (HTTP, latencia, operaciones de wallet, GGR, sistema). Apunta ahí un Prometheus/Grafana Cloud o el add-on de métricas de tu host.
- **Probes:** configura liveness `/api/v1/health` y readiness `/api/v1/ready` en el orquestador.
- **Errores (opcional):** integrar Sentry es enchufar `@sentry/node` con `SENTRY_DSN` (pendiente).

## Checklist de seguridad en producción

- [ ] Cada secreto generado con `openssl rand -hex 32` (nunca los de dev).
- [ ] `WEB_ORIGIN` / `ADMIN_ORIGIN` = las URLs reales (CORS).
- [ ] HTTPS en todo (Vercel y el host lo dan; las cookies son `Secure` en prod).
- [ ] 2FA del admin activado (panel → Seguridad).
- [ ] `/metrics` no expuesto públicamente sin control.
