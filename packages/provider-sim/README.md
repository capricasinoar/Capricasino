# @capri/provider-sim (Semana 3)

Proveedor de juegos **simulado** que habla el protocolo real seamless-wallet (docs/architecture.md Cap. 3.9). El wallet del operador no distingue este proveedor de uno real — esa es la costura hacia dinero real (🧩 COSTURA-REAL #3).

## Qué hace

- **`POST /launch`** — el operador pide la URL del juego; devuelve `/play/dice?token=…`.
- **`GET /play/dice`** — sirve el juego (HTML autocontenido) que el casino abre en un `<iframe>`.
- **`POST /api/dice/roll`** — el juego resuelve la tirada con RNG **provably fair** y golpea el callback del operador con `bet` y, si gana, `win` — firmando cada uno con HMAC.
- **RNG provably fair:** `resultado = HMAC(serverSeed, clientSeed:nonce)`. El hash de `serverSeed` se publica antes de apostar; al rotar la semilla se revela la anterior y el jugador puede recalcular cada tirada.

## Protocolo (Cap. 3.3)

Cada callback lleva `hash = HMAC-SHA256(canonicalString, PROVIDER_SIM_SECRET)`. Cadena canónica:
`action|token|amount|roundId|transactionId|referenceTransactionId|timestamp`. El operador la verifica con `timingSafeEqual` **antes** de tocar lógica (TRAMPA #5).

## Modo caos

`CHAOS_DUPLICATE_PROB=0.5` hace que el cliente duplique callbacks a propósito, para probar la idempotencia del wallet en vivo. Los tests de resiliencia (`provider.integration.spec.ts`) cubren duplicados, fuera de orden, firmas falsas y bombardeo concurrente.

## Arrancar

```bash
pnpm --filter @capri/provider-sim dev   # http://localhost:4100
```

Necesita el API (operador) en marcha para los callbacks. Variables en `.env` (`PROVIDER_SIM_SECRET`, `OPERATOR_CALLBACK_URL`, `SIM_PORT`).

## House edge

Dice: `multiplicador = 99 / target` → 1% de ventaja de la casa (RTP 99%).
