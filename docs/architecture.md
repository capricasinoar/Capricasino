# Plataforma de Casino Online — Arquitectura Técnica Completa (Versión *Play Money* / Portfolio)

> **Documento de ingeniería. Versión 1.0 — 2026.**
> Diseñado para construir una plataforma de casino online **con dinero ficticio (play money)**, con proveedores de juego **simulados**, replicando fielmente la arquitectura, la dificultad de ingeniería y los patrones de una plataforma real.
> El objetivo es doble: (1) servir como pieza de portfolio / producto B2B demostrable, y (2) constituir una base sobre la que, **si en el futuro se obtiene una licencia**, se enchufa la capa regulatoria y de dinero real sin reescribir el núcleo.

---

## Cómo leer este documento

Cada capítulo es autocontenido. A lo largo del texto vas a encontrar dos marcadores recurrentes:

- 🧩 **COSTURA-REAL** — Señala un punto donde, el día que exista licencia, se enchufa un componente de dinero real (PSP, proveedor certificado, KYC, reporting). El diseño *play money* deja ahí una interfaz limpia para no reescribir.
- ⚠️ **TRAMPA** — Un error clásico de la industria que hunde plataformas. Se explica el problema y la solución.

**Regla de oro del proyecto:** todo lo que toca saldo pasa por el **Wallet Service** y queda escrito en el **Ledger** de doble entrada. Ningún otro servicio modifica saldos directamente. Si respetás esto, la mitad de los bugs catastróficos de un casino desaparecen por diseño.

---

## Índice

- **Cap. 0 — Realidad regulatoria y las "costuras" hacia dinero real** *(el capítulo que casi nadie escribe y es el más importante)*
- **Cap. 1 — ¿Cómo funciona un casino online?** (operador, agregador, proveedor, flujo de una apuesta)
- **Cap. 2 — Arquitectura del sistema** (stack 2026, justificado)
- **Cap. 3 — Proveedores de juegos** (cómo funcionan de verdad, y cómo los simulamos)
- **Cap. 4 — Agregadores** (cuándo sí, cuándo no, costos)
- **Cap. 5 — Wallet** (idempotencia, atomicidad, ledger, race conditions)
- **Cap. 6 — Base de datos** (esquema completo y relaciones)
- **Cap. 7 — APIs** (contratos con ejemplos JSON)
- **Cap. 8 — Seguridad**
- **Cap. 9 — Real-time**
- **Cap. 10 — Panel administrador**
- **Cap. 11 — Backoffice**
- **Cap. 12 — Complicaciones reales** (la lista larga, con solución)
- **Cap. 13 — Despliegue**
- **Cap. 14 — Desarrollo con Claude Code** (módulos, repo, prompts)
- **Cap. 15 — Roadmap semana a semana**

---

# Capítulo 0 — Realidad regulatoria y las "costuras" hacia dinero real

Este capítulo existe porque la pregunta que hiciste —"si conseguimos licencia, ¿se puede dar de alta normal?"— tiene una respuesta que condiciona **cómo** diseñamos hoy. Si diseñás el play money ignorando la capa real, después reescribís medio sistema. Si dejás las costuras previstas, la transición es de semanas.

## 0.1 Qué es "dinero real" en términos de arquitectura

Una plataforma de dinero real se diferencia de una *play money* en cinco capas, y **solo cinco**. El resto del sistema es idéntico:

1. **Ingreso/egreso de fondos (PSP).** En play money, los "depósitos" son un botón que acredita saldo ficticio. En real, es un Payment Service Provider (tarjetas, transferencias, cripto) con conciliación bancaria. 🧩 **COSTURA-REAL #1.**
2. **KYC/AML.** Verificación de identidad y prevención de lavado. En play money no existe; el usuario se registra con un email. 🧩 **COSTURA-REAL #2.**
3. **Proveedores de juego certificados.** En play money usamos un *provider simulado* con RNG propio auditado por nosotros. En real, se integra Pragmatic/Evolution/etc. bajo contrato y con su RNG certificado. 🧩 **COSTURA-REAL #3.**
4. **Juego responsable.** Límites de depósito, autoexclusión, reality checks. Obligatorio en toda jurisdicción seria. 🧩 **COSTURA-REAL #4.**
5. **Reporting regulatorio.** Reportes periódicos al regulador, retención de logs por X años, trazabilidad de cada apuesta. 🧩 **COSTURA-REAL #5.**

**La consecuencia de diseño:** cada una de esas cinco capas se implementa hoy como una **interfaz** (un contrato/puerto) con una implementación *fake* enchufada detrás. El día de la licencia, se cambia la implementación, no el contrato. Esto es el patrón **Ports & Adapters (Hexagonal)** y es la razón por la que va a aparecer varias veces en el documento.

```
                 NÚCLEO (idéntico en play money y real)
        ┌───────────────────────────────────────────────┐
        │  Wallet · Ledger · Motor de rondas · Real-time │
        │  Catálogo de juegos · Sesiones · Bonos · Admin │
        └───────────────────────────────────────────────┘
              │        │         │          │        │
        ┌─────┴──┐ ┌───┴───┐ ┌───┴────┐ ┌───┴───┐ ┌──┴─────┐
        │ PSP    │ │ KYC   │ │Provider│ │Respons│ │Report. │   ← PUERTOS
        │ Port   │ │ Port  │ │ Port   │ │ Port  │ │ Port   │
        └─────┬──┘ └───┬───┘ └───┬────┘ └───┬───┘ └──┬─────┘
              │        │         │          │        │
     play →  FAKE    NOOP    SIMULADO    BÁSICO   CONSOLE      ← ADAPTERS (hoy)
     real →  Stripe  Sumsub  Pragmatic   Full     RegAPI       ← ADAPTERS (mañana)
```

Si construimos así, tu frase "dar de alta normal" se traduce en: *implementar cinco adapters nuevos y pasar una certificación*. Nada del núcleo se toca.

## 0.2 Qué NO se puede reutilizar tal cual

Sé honesto con el cliente sobre esto, porque es donde se generan falsas expectativas:

- **La certificación no se hereda.** Aunque el RNG del provider simulado sea perfecto, un regulador exige RNG certificado por un laboratorio (GLI, iTech Labs, BMM). El motor simulado sirve para *desarrollo y demo*, no pasa auditoría.
- **El historial play money no migra a real.** Saldos ficticios no se convierten en dinero. La base arranca limpia.
- **KYC obliga a cambios de UX y de modelo de datos** (documentos, verificación, estados de cuenta). Por eso lo dejamos previsto en el esquema desde hoy (campos y tablas presentes, sin usarse).

## 0.3 El orden real de la industria (para que el cliente lo sepa)

Cuando alguien monta un operador legal, el orden es: **licencia → certificación → PSP con KYC → integración de proveedores → lanzamiento.** La ingeniería de plataforma corre en paralelo, pero *no se puede lanzar con dinero real* hasta que las primeras cuatro están. Construir el software primero (que es lo que hacemos acá) es correcto y normal; simplemente no es lo último que falta para operar.

---

# Capítulo 1 — ¿Cómo funciona un casino online?

## 1.1 Los tres actores

Un casino online no es una sola empresa haciendo todo. Es una cadena de tres roles. Entenderla es entender el 80% de la arquitectura.

**Operador.** Es la marca de cara al jugador: el sitio, la cuenta, el saldo, el soporte, las promociones. El operador **no fabrica los juegos**. Su trabajo es: captar y retener jugadores, custodiar el saldo (wallet), procesar pagos, cumplir la regulación, y ofrecer un catálogo de juegos que obtiene de terceros. En nuestro proyecto, **vos construís el operador.**

**Proveedor de juegos (Game Provider / Studio).** Es quien fabrica y opera el juego en sí: Pragmatic Play (slots), Evolution (ruleta y blackjack en vivo), Spribe (Aviator). El juego —su lógica, su RNG, sus gráficos, su resultado— **corre en los servidores del proveedor**, no en los tuyos. El operador solo "abre una ventana" al juego del proveedor y le presta el servicio de wallet.

**Agregador (Aggregator).** Un intermediario que se integra una vez con muchos proveedores y le ofrece al operador **una sola API** para acceder a todos. En vez de integrar 14 proveedores (14 contratos, 14 APIs distintas), integrás un agregador y tenés cientos de juegos. Cap. 4 entra en detalle.

```
   ┌──────────┐        ┌──────────────┐        ┌───────────────┐
   │ JUGADOR  │◄──────►│   OPERADOR   │◄──────►│  AGREGADOR /  │
   │ (browser)│        │  (vos: web,  │        │  PROVEEDOR    │
   │          │        │  wallet, DB) │        │  (juego+RNG)  │
   └──────────┘        └──────────────┘        └───────────────┘
     Ve la marca         Custodia saldo          Fabrica y corre
     y el saldo          y catálogo              el juego
```

## 1.2 La distinción clave: dónde vive el saldo vs. dónde vive el juego

Este es el concepto que más cuesta al principio y del que depende todo:

- **El juego vive en el proveedor.** Cuando el jugador gira una slot, esa lógica corre en los servidores de Pragmatic. Tu plataforma no sabe cómo funciona la slot por dentro, ni le importa.
- **El saldo vive en el operador (vos).** El proveedor **no tiene el dinero del jugador.** Cuando el jugador apuesta $10, el proveedor le pide a tu wallet: "descontá $10 de este jugador". Cuando gana $50, el proveedor te dice: "acreditá $50".

Esta separación se llama **Seamless Wallet** (wallet integrado) y es el modelo estándar de la industria. El proveedor delega la custodia del saldo en el operador y solo le manda *órdenes de débito y crédito* durante el juego. (Existe también el modelo *Transfer Wallet*, más viejo y peor, donde el jugador "transfiere" saldo al proveedor antes de jugar; lo ignoramos, seamless es el estándar 2026.)

🧩 **COSTURA-REAL #3:** En play money, *nosotros somos el proveedor*. Construimos un "provider simulado" que corre juegos simples (un dado, una moneda, una mini-slot) con RNG propio, y que le habla a nuestro wallet **con exactamente el mismo protocolo** que usaría Pragmatic. Así, el wallet no distingue entre un juego simulado y uno real: el día que integrás un proveedor real, el wallet ya habla su idioma.

## 1.3 Cómo viaja una apuesta — el flujo completo

Sigamos una apuesta de principio a fin. El jugador tiene $100 y apuesta $10 en una slot.

```
JUGADOR          OPERADOR (vos)                      PROVEEDOR (sim/real)
   │                   │                                    │
   │  1. Click "girar" │                                    │
   ├──────────────────────────────────────────────────────►│
   │                   │           (el juego corre en el proveedor)
   │                   │                                    │
   │                   │  2. DEBIT $10 (bet)                │
   │                   │◄───────────────────────────────────┤
   │                   │                                    │
   │         3. Wallet valida:                              │
   │            - ¿saldo >= 10?  sí                          │
   │            - ¿idempotente?  (¿ya vi este tx_id?) no    │
   │            - descuenta 10 → saldo 90                    │
   │            - escribe en ledger                          │
   │                   │                                    │
   │                   │  4. OK, balance=90                 │
   │                   ├───────────────────────────────────►│
   │                   │                                    │
   │                   │        5. el RNG resuelve: ganó $50│
   │                   │                                    │
   │                   │  6. CREDIT $50 (win)               │
   │                   │◄───────────────────────────────────┤
   │                   │                                    │
   │         7. Wallet: saldo 90 → 140, ledger              │
   │                   │  8. OK, balance=140                │
   │                   ├───────────────────────────────────►│
   │                   │                                    │
   │  9. Animación: "¡Ganaste $50!" saldo 140               │
   │◄───────────────────────────────────────────────────────┤
```

Los pasos 2-8 son **server-to-server**: el proveedor le habla directo a tu backend, no pasa por el browser del jugador (que sería falsificable). El browser solo recibe la animación final y el nuevo saldo, normalmente empujado por WebSocket (Cap. 9).

## 1.4 Cómo se valida una apuesta

Cuando llega el `DEBIT` (paso 2), el wallet ejecuta una secuencia **atómica** (todo o nada) de validaciones. Este es el corazón del sistema y el Cap. 5 lo desarrolla, pero el resumen:

1. **Autenticidad.** ¿La petición viene realmente del proveedor? Se verifica una firma HMAC o un token. Un `DEBIT` no autenticado es un intento de robo.
2. **Sesión válida.** ¿Existe una sesión de juego abierta para este jugador y este juego?
3. **Idempotencia.** ¿Ya procesé esta transacción antes? Cada operación trae un `transaction_id` único del proveedor. Si ya lo vi, **devuelvo el mismo resultado sin volver a descontar.** (⚠️ **TRAMPA** #1 de la industria: sin esto, un reintento por timeout descuenta dos veces.)
4. **Fondos suficientes.** ¿El saldo alcanza? Si no, se rechaza con un error específico (`INSUFFICIENT_FUNDS`).
5. **Aplicación atómica.** Se descuenta el saldo y se escribe el asiento en el ledger **en la misma transacción de base de datos.** O pasan las dos cosas, o ninguna.

## 1.5 Cómo se paga un premio

El `CREDIT` (win) es más simple que el débito porque **nunca falla por fondos** (siempre podés acreditar). Pero tiene su propia trampa:

⚠️ **TRAMPA #2:** El `win` también debe ser **idempotente**. Si el proveedor no recibió tu "OK" del crédito (timeout de red) y reintenta, no podés acreditar el premio dos veces. Mismo mecanismo: `transaction_id` único, si ya lo procesaste devolvés el resultado anterior.

Además, muchos juegos mandan **bet y win como una sola operación** (`bet+win` atómico, típico en juegos de resultado inmediato) o como operaciones separadas con un `round_id` que las vincula (típico en juegos con estados, como una mano de blackjack que dura varios pasos). Tu wallet tiene que soportar ambos. Cap. 5.

## 1.6 Cómo se comunica todo — los protocolos

- **Jugador ↔ Operador:** HTTPS (REST para acciones, WebSocket para tiempo real). El frontend es una SPA (Next.js).
- **Operador ↔ Proveedor:** HTTPS REST server-to-server, con firmas HMAC. El proveedor llama a tu **callback endpoint** (`/wallet/callback`) para cada débito/crédito. Vos llamás a la API del proveedor para *lanzar* el juego (obtener la URL del iframe).
- **Interno (entre tus servicios):** REST/gRPC si separás en microservicios, o llamadas directas si arrancás monolito modular (recomendado al inicio — Cap. 2). Eventos asíncronos por una cola (Redis Streams / BullMQ) para cosas como notificaciones, analytics, actualización de leaderboards.

## 1.7 El "launch" de un juego — cómo se abre

Antes de que el jugador pueda jugar, el operador tiene que *lanzar* el juego. El flujo:

```
1. Jugador click en "Sweet Bonanza"
2. Frontend → Backend: POST /games/launch { gameId, ... }
3. Backend crea una game_session (round_id, token temporal)
4. Backend → Proveedor: "dame la URL para este jugador y juego"
   (le pasás un token que identifica la sesión; el proveedor lo
    usará después en los callbacks para saber quién apuesta)
5. Proveedor devuelve URL del juego
6. Frontend abre esa URL en un <iframe>
7. El juego carga; a partir de acá los DEBIT/CREDIT fluyen
   server-to-server usando el token de sesión
```

🧩 **COSTURA-REAL:** En play money, el paso 4-5 lo responde tu *provider simulado* devolviendo la URL de un juego propio (un componente React con un dado o una slot simple). En real, lo responde la API de Pragmatic con la URL de su juego. El frontend y el wallet no cambian.

---

# Capítulo 2 — Arquitectura del sistema

## 2.1 Decisión estructural de fondo: ¿monolito o microservicios?

Esta es la primera gran decisión y la que más gente arruina copiando a empresas de otra escala.

**No arranques con microservicios.** Un casino en etapa play money / portfolio con un solo equipo (vos + Claude Code) no tiene el problema que los microservicios resuelven (equipos grandes independientes, escalado desacoplado de partes muy dispares). Lo que los microservicios *sí* te traen desde el día uno es: transacciones distribuidas, consistencia eventual, debugging entre servicios, y una complejidad de despliegue que te frena. En un sistema donde **el saldo tiene que ser fuertemente consistente**, la consistencia eventual es tu enemiga.

**Arrancá con un monolito modular** (también llamado "modular monolith"). Un solo proceso desplegable, pero internamente dividido en módulos con fronteras estrictas (wallet, games, auth, bonus, admin), donde cada módulo solo se comunica con otro a través de una interfaz pública, nunca tocando sus tablas directamente. Esto te da el 90% del beneficio de los microservicios (código organizado, fronteras claras) sin el costo. Y —clave para tu pregunta original— **si algún módulo necesita convertirse en microservicio después** (típicamente el motor de juego en vivo, o analytics), las fronteras ya están, así que lo extraés sin cirugía mayor.

```
        ┌─────────────────────────────────────────────────┐
        │              MONOLITO MODULAR (1 deploy)          │
        │                                                   │
        │  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐     │
        │  │  auth  │ │ wallet │ │ games  │ │ bonus  │ ... │
        │  └───┬────┘ └───┬────┘ └───┬────┘ └───┬────┘     │
        │      │          │          │          │           │
        │  ════╪══════════╪══════════╪══════════╪═══════    │
        │      │   interfaces públicas (contratos)          │
        │  cada módulo dueño de SUS tablas; nadie toca      │
        │  las tablas de otro directamente                  │
        └─────────────────────────────────────────────────┘
                  │              │
            ┌─────┴────┐   ┌─────┴─────┐
            │PostgreSQL│   │   Redis   │
            └──────────┘   └───────────┘

  Candidato #1 a extraerse a servicio aparte más adelante:
  el "provider engine" (juegos en vivo / real-time pesado)
```

⚠️ **TRAMPA #3:** El error más caro que vas a ver en tutoriales de "casino microservicios" es poner el wallet en un servicio y los juegos en otro y coordinar la apuesta con llamadas HTTP entre ellos. Eso convierte una transacción de DB atómica (trivial) en una saga distribuida (dificilísima, con estados intermedios, compensaciones, y ventanas donde el saldo es inconsistente). No lo hagas. El wallet y el registro de la apuesta viven en el mismo servicio y la misma transacción de DB.

## 2.2 El stack 2026, capa por capa

### Frontend — Next.js 15 (App Router) + React 19 + TypeScript

**Por qué Next.js:** Server Components reducen el JS que baja al cliente (crítico para la "carga instantánea" estilo Stake), el routing por archivos acelera el desarrollo con Claude Code (estructura predecible), y el rendering híbrido (SSR para el shell, CSR para lo interactivo) te da SEO en las páginas públicas y reactividad en el juego.

**Trade-off:** Next.js es más pesado conceptualmente que un Vite + React puro. ¿Vale la pena? Sí, porque la parte pública del casino (landing, promos, catálogo SEO) se beneficia del SSR, y el App Router te da streaming de UI que se siente instantáneo. Si fuera *solo* app privada sin SEO, Vite + React sería defendible y más simple. Para un casino con marketing, Next.js gana.

- **Estado servidor:** TanStack Query (cache, revalidación, optimistic updates para que el saldo se sienta instantáneo).
- **Estado cliente:** Zustand (mínimo, para UI). Evitá Redux salvo que crezca mucho.
- **Estilos:** Tailwind CSS v4 + un sistema de design tokens propio. Sobre esto se construye la identidad visual (Cap. UX).
- **Componentes:** shadcn/ui como base (copiás el código, es tuyo, lo personalizás — ideal para que Claude Code lo mantenga).
- **WebSocket cliente:** Socket.IO client o WS nativo con una capa de reconexión propia.

### Backend — Node.js + NestJS + TypeScript

**Por qué NestJS y no Fastify pelado:** Tu proyecto lo va a mantener una IA durante años. NestJS impone una **estructura fuerte y predecible** (módulos, providers, inyección de dependencias, decoradores) que es exactamente lo que hace que Claude Code no se pierda: cada cosa tiene su lugar canónico. La inyección de dependencias, además, es *la* herramienta que hace realidad el patrón Ports & Adapters del Cap. 0 — cambiás el adapter fake por el real en un módulo de configuración, sin tocar la lógica.

**Trade-off honesto:** NestJS tiene overhead de arranque y una curva de abstracción; Fastify solo es más rápido en benchmarks crudos y más liviano. Pero el cuello de botella de un casino **nunca es el framework HTTP**, es la base de datos y la red hacia proveedores. La velocidad de Fastify no te compra nada que importe, y perdés la estructura. Nota: NestJS puede correr *sobre* Fastify como adaptador HTTP, así que en la práctica tenés ambos: estructura de Nest + performance de Fastify. **Esa es la elección: NestJS con adaptador Fastify.**

- **ORM:** Prisma. Migraciones declarativas, tipos autogenerados (TypeScript de punta a punta), y un modelo de datos legible que Claude Code entiende y modifica bien. Trade-off: Prisma en queries muy complejas o de altísimo rendimiento a veces se queda corto; para esos casos puntuales se baja a SQL crudo (Prisma lo permite). El 95% del CRUD lo hace Prisma; el motor de wallet usa transacciones de Prisma con niveles de aislamiento explícitos (Cap. 5).
- **Validación:** Zod (esquemas compartidos entre front y back en un paquete común del monorepo).

### Base de datos — PostgreSQL 16+

**Por qué Postgres y no MongoDB:** El dominio de un casino es **fuertemente relacional y transaccional**. Saldos, asientos contables, apuestas vinculadas a rondas vinculadas a sesiones vinculadas a usuarios: eso es un modelo relacional de manual. Y sobre todo, necesitás **transacciones ACID reales con aislamiento serializable** para el wallet. Postgres te da eso, más tipos avanzados (JSONB para payloads flexibles de proveedores, arrays, rangos), más `SELECT ... FOR UPDATE` para bloqueos de fila (Cap. 5). MongoDB te obligaría a inventar consistencia a mano justo donde no podés fallar.

**Extensiones/patrones que usamos:** `numeric` (nunca `float`) para dinero, constraints `CHECK` para invariantes (ej: saldo >= 0), índices parciales, y particionado de las tablas de alto volumen (`transactions`, `bets`) por rango de fecha cuando crezcan.

### Cache — Redis 7+

Roles de Redis en el sistema (hace varias cosas, no las confundas):
1. **Cache de lecturas calientes:** catálogo de juegos, configs, perfil. TTL corto.
2. **Sesiones y rate limiting:** contadores con expiración.
3. **Pub/Sub y colas:** eventos entre módulos, jobs asíncronos (BullMQ corre sobre Redis). Notificaciones, emails, actualización de leaderboards.
4. **Locks distribuidos:** cuando escales a más de una instancia del backend, Redlock para locks que no puede dar la DB.

⚠️ **TRAMPA #4:** Redis es cache, **no es la fuente de verdad del saldo.** Nunca. El saldo autoritativo vive en Postgres. Redis puede *cachear* el saldo para lecturas rápidas, pero toda escritura va a Postgres primero y la cache se invalida. Si tratás a Redis como fuente de verdad de saldos, un reinicio de Redis te borra dinero (ficticio hoy, real mañana) y no hay ledger que te salve.

### WebSockets — Socket.IO (sobre el mismo backend Nest, al inicio)

Para actualización de saldo en vivo, notificaciones, jackpots, leaderboards, chat. NestJS tiene soporte de WebSocket Gateways de primera clase. Al escalar horizontalmente, se usa el adaptador de Redis para Socket.IO (para que un mensaje llegue a un cliente conectado a otra instancia). Cap. 9.

### API Gateway / Edge — Cloudflare + Nginx

- **Cloudflare** al frente: CDN para assets, WAF, protección DDoS, rate limiting de borde, TLS. (Cap. 8)
- **Nginx** como reverse proxy interno / balanceador ante las instancias del backend, terminación de conexiones, y servir estáticos si hiciera falta.

### Observabilidad — Prometheus + Grafana + Sentry + OpenTelemetry

Métricas (Prometheus/Grafana), errores (Sentry), y trazas distribuidas (OpenTelemetry) desde el día uno. En un casino, "el saldo de un usuario quedó raro" se debuggea con trazas y con el ledger, no adivinando. Cap. 13.

## 2.3 Monorepo

Todo en un monorepo con **pnpm workspaces + Turborepo**:

```
casino/
├── apps/
│   ├── web/            # Next.js (frontend jugador)
│   ├── admin/          # Next.js (panel admin/backoffice) — app separada
│   └── api/            # NestJS (backend)
├── packages/
│   ├── contracts/      # tipos + esquemas Zod compartidos front/back
│   ├── ui/             # componentes compartidos
│   ├── config/         # tsconfig, eslint, prettier compartidos
│   └── provider-sim/   # el proveedor de juegos simulado (Cap. 3)
└── infra/              # Docker, k8s, CI/CD
```

**Por qué monorepo:** los contratos de API (tipos, esquemas de validación) se comparten entre front y back en un solo paquete, así que un cambio de contrato rompe el build en compile-time en vez de en producción. Para desarrollo con Claude Code es ideal: ve todo el sistema en un solo árbol y los tipos lo guían.

## 2.4 Diagrama de arquitectura completo

```
                          ┌───────────────┐
                          │   CLOUDFLARE  │  WAF · DDoS · CDN · TLS
                          └───────┬───────┘
                                  │
                          ┌───────┴───────┐
                          │     NGINX     │  reverse proxy / LB
                          └───┬───────┬───┘
                    ┌─────────┘       └─────────┐
              ┌─────┴──────┐            ┌────────┴─────┐
              │  web (Next)│            │ admin (Next) │
              └─────┬──────┘            └────────┬─────┘
                    │  REST + WS                 │ REST
                    └──────────┬─────────────────┘
                          ┌────┴─────┐
                          │ API Nest │  monolito modular
                          │ ┌──────┐ │  auth·wallet·games·
                          │ │module│ │  bonus·admin·rt
                          │ │ …    │ │
                          │ └──────┘ │
                          └─┬──────┬─┘
                   ┌────────┘      └────────┐
             ┌─────┴─────┐            ┌──────┴─────┐
             │ PostgreSQL│            │   Redis    │
             │ (verdad)  │            │ cache·cola │
             └───────────┘            │ ·pubsub    │
                                      └────────────┘
                          ┌──────────────┐
                          │ provider-sim │  ◄── COSTURA-REAL:
                          │ (juegos +RNG)│      aquí se enchufa
                          └──────────────┘      Pragmatic/agregador
```


---

# Capítulo 3 — Proveedores de juegos

## 3.1 Cómo funciona un proveedor, de verdad

Un proveedor (Pragmatic Play, Evolution, Spribe, etc.) es una empresa de software que fabrica juegos y los **opera en su propia infraestructura**. Vos, el operador, nunca recibís "el juego" como un archivo que corrés vos. Recibís **acceso** a un juego que corre en los servidores del proveedor. Esto es fundamental y a veces contraintuitivo: la lógica del RNG, el resultado del giro, el cálculo del premio — todo pasa en el lado del proveedor. Tu rol es (a) lanzar el juego y (b) prestar el wallet.

Esto tiene una razón regulatoria además de técnica: el proveedor es quien tiene el **RNG certificado**. Si el resultado se calculara en tu lado, tendrías que certificar vos el RNG, y perderías la garantía de imparcialidad que da tener al fabricante del juego calculando el resultado. 🧩 **COSTURA-REAL:** por eso en play money nuestro provider simulado *también* calcula el resultado de su lado — replicamos la arquitectura correcta, aunque nuestro RNG no esté certificado (no puede estarlo, es de juguete).

## 3.2 El perfil de cada proveedor (para que sepas qué integrarías el día real)

Descripción funcional de cada uno, útil para el catálogo y para entender qué tipo de integración implica:

- **Pragmatic Play** — El más grande en slots y también en vivo. Catálogo enorme, muy demandado. Integración típica vía agregador o directa. Slots de resultado inmediato (bet+win atómico) más juegos con features (free spins, bonus buy).
- **Evolution** — El líder absoluto de casino **en vivo** (ruleta, blackjack, game shows tipo Crazy Time). Juegos con **estado y duración** (una mesa dura, varias apuestas por ronda, muchos jugadores simultáneos). Integración más pesada: mucho real-time, rondas largas, múltiples apuestas por ronda.
- **Spribe** — Dueños de **Aviator**, el "crash game" que definió una categoría. Juego social, multijugador, con un multiplicador que sube y el jugador cobra antes de que "explote". Real-time intenso, apuestas y cashouts rápidos.
- **BGaming** — Slots y juegos "originals" (dice, plinko, mines) — justamente el estilo *Stake Originals*. Provider-friendly, buena documentación. **Referencia directa para los juegos propios que vas a simular.**
- **Hacksaw Gaming** — Slots modernas, mecánicas innovadoras, muy popular con público joven. Formato liviano, mobile-first.
- **Play'n GO** — Veterano de slots premium (Book of Dead). Catálogo sólido y estable.
- **NetEnt** — Clásico histórico (Starburst, Gonzo's Quest). Ahora parte de Evolution.
- **Nolimit City** — Slots de altísima volatilidad y mecánicas extremas, culto entre jugadores expertos.
- **Amusnet** (ex-EGT) — Fuerte en mercados de Europa del Este, slots estilo "clásico".
- **Onlyplay** — Juegos instantáneos y casuales, crash/mines/originals.
- **Spinomenal** — Catálogo amplio de slots, muy configurable para operadores.
- **BetGames** — Juegos en vivo "betting-style" (dados, ruedas, cartas) pensados como apuestas.
- **Booming Games** — Slots coloridas, formato ágil.
- **3 Oaks** (ex-Booongo) — Slots, fuerte en Asia y Europa del Este, con torneos y jackpots de red.

**Qué te dice esta lista para la arquitectura:** hay dos grandes familias de juego, y tu sistema tiene que soportar ambas:
1. **Resultado inmediato** (slots, dice, plinko): una acción → un resultado → bet+win casi atómico. Simple.
2. **Con estado / duración** (vivo, crash, blackjack): una ronda dura, con múltiples apuestas, cashouts, y estados intermedios. Complejo (Cap. 5, rondas).

## 3.3 Cómo se conectan — el protocolo Seamless Wallet en detalle

Casi todos los proveedores modernos usan el mismo patrón conceptual (los detalles cambian, la forma no). Dos direcciones de comunicación:

**Dirección A — Operador llama al Proveedor (para lanzar juego):**
```
POST https://provider.com/api/game/launch
Headers: Authorization / firma
Body: {
  "game_id": "sweet_bonanza",
  "player_token": "sess_abc123",   // identifica la sesión en TU lado
  "currency": "FUN",                // play money: moneda ficticia
  "language": "es",
  "lobby_url": "https://tucasino.com/lobby",
  "return_url": "..."
}
Respuesta: { "game_url": "https://provider.com/launch/xyz..." }
```
El operador mete `game_url` en un iframe. El `player_token` es la pieza clave: el proveedor lo va a devolver en cada callback para que sepas de quién es la apuesta.

**Dirección B — Proveedor llama al Operador (callbacks de wallet):**

Estos son los que importan. El proveedor golpea *tu* endpoint. Ejemplos de los tres callbacks fundamentales:

`balance` — "¿cuánto saldo tiene este jugador?"
```
POST https://tucasino.com/provider/callback
{
  "action": "balance",
  "player_token": "sess_abc123",
  "request_id": "req_001",
  "hash": "hmac_sha256(...)"          // firma
}
→ Respondés: { "status":"OK", "balance": 10000, "currency":"FUN" }
   (balance en la unidad mínima, ej. centavos ficticios)
```

`bet` (debit) — "descontá esta apuesta"
```
{
  "action": "bet",
  "player_token": "sess_abc123",
  "amount": 1000,                     // 10.00 FUN en centavos
  "game_id": "sweet_bonanza",
  "round_id": "round_555",
  "transaction_id": "tx_debit_999",   // ← ID ÚNICO para idempotencia
  "request_id": "req_002",
  "hash": "..."
}
→ { "status":"OK", "balance": 9000, "transaction_id":"tx_debit_999" }
   o { "status":"INSUFFICIENT_FUNDS", "balance": 500 }
```

`win` (credit) — "acreditá este premio"
```
{
  "action": "win",
  "player_token": "sess_abc123",
  "amount": 5000,                     // 50.00 FUN
  "round_id": "round_555",            // misma ronda que el bet
  "transaction_id": "tx_win_1000",    // ← ID ÚNICO distinto del bet
  "request_id": "req_003",
  "hash": "..."
}
→ { "status":"OK", "balance": 14000 }
```

## 3.4 Autenticación entre operador y proveedor

Dos mecanismos combinados, típicamente:
- **API Key / Secret compartido:** cada proveedor te da credenciales. La usás para llamar a su API (launch) y para verificar sus llamados a vos.
- **Firma HMAC:** cada callback trae un `hash` = HMAC-SHA256 del payload (o de campos concatenados) usando el secret compartido. Vos recalculás el HMAC de tu lado y comparás. Si no coincide → 401, la petición es falsa o alterada. Esto evita que alguien que descubra tu endpoint de callback te mande "acreditá 1 millón".

⚠️ **TRAMPA #5:** verificá la firma **antes** de tocar cualquier lógica, y usá comparación de tiempo constante (`crypto.timingSafeEqual`) para evitar ataques de timing. Y validá que el `player_token` corresponda a una sesión *activa*: un token viejo no debe poder mover saldo.

## 3.5 Validación de apuestas, resultados y notificaciones

- **Validación de la apuesta:** la hace tu wallet (fondos, idempotencia, sesión) — Cap. 5. El proveedor asume que si respondés `OK`, descontaste.
- **Envío de resultados:** el proveedor calcula el resultado y te manda el `win` (o no manda nada si el jugador perdió — en muchos protocolos "perder" es simplemente un `bet` sin `win` posterior). El resultado *del juego* (qué símbolos salieron) suele viajar como metadata informativa, pero **la verdad económica es el par bet/win.**
- **Jackpots:** los progresivos se notifican con un callback especial (`jackpot_win` o un `win` con un flag). El monto puede venir de un pool que administra el proveedor/agregador. En tu simulador, modelás un jackpot propio con un contador en Redis que incrementa con cada apuesta y se paga con probabilidad baja.

## 3.6 Callbacks, reintentos, idempotencia y duplicados — el nudo central

Esto es lo que separa una plataforma que funciona de una que pierde dinero. La red **no es confiable**. Concretamente:

**El escenario del timeout fantasma:**
```
1. Proveedor manda bet $10, transaction_id=tx_999
2. Tu wallet descuenta $10, escribe ledger, saldo=90
3. Respondés OK... pero la respuesta se pierde en la red
4. El proveedor NO recibió tu OK. Cree que falló.
5. El proveedor REINTENTA: bet $10, transaction_id=tx_999 (¡mismo ID!)
```
Sin idempotencia, en el paso 5 descontás **otra vez** → saldo 80, y el jugador perdió $20 por una apuesta de $10. Con idempotencia: en el paso 5 ves que `tx_999` ya fue procesado, y **devolvés exactamente la misma respuesta que la primera vez** (`OK, balance=90`) **sin volver a descontar.** El proveedor recibe su OK, todos contentos.

**Cómo se implementa la idempotencia (patrón concreto):**
- Tabla `transactions` con `provider_transaction_id` **UNIQUE**.
- Al procesar un callback: intentás insertar la transacción. Si la constraint UNIQUE falla → ya existe → leés la transacción existente y devolvés su resultado guardado. Si inserta bien → es nueva, la procesás.
- **Todo dentro de una transacción de DB.** El insert de la transacción y el update del saldo son atómicos.

**Duplicados vs. reintentos:** un reintento trae el *mismo* `transaction_id` (idempotencia lo maneja). Un duplicado real (dos apuestas legítimas distintas) trae `transaction_id` *distintos* — y esos sí se procesan ambos. La clave es que el proveedor genera un ID único por operación económica, no por reintento.

**Eventos fuera de orden:** a veces llega el `win` antes que el `bet` (red rara). Solución: el `round_id` los vincula, y el `win` no depende de que el `bet` haya llegado (acreditar nunca falla por fondos). Si tu lógica de negocio necesita el bet primero (ej: validar que la ronda existe), guardás el win como "pendiente de conciliar" y lo resolvés cuando llega el bet, o lo aceptás y reconciliás por `round_id`. Para juegos de resultado inmediato esto casi no pasa; para juegos con estado, el `round_id` es el pegamento.

## 3.7 Qué pasa si se cae internet / el proveedor

- **Se cae tu lado (durante un bet):** el proveedor no recibe OK, reintenta con backoff. Cuando volvés, idempotencia evita doble descuento. La apuesta se completa tarde pero bien.
- **Se cae el proveedor (durante una ronda con estado):** la ronda queda "abierta" de tu lado. Necesitás un **job de reconciliación** que, pasado un timeout, consulte el estado de rondas abiertas contra el proveedor (endpoint de reconciliación que casi todos ofrecen) y resuelva: o se completó y no te enteraste (aplicás el win), o se canceló (hacés rollback del bet — Cap. 5).
- **Rollback / cancel:** callback `rollback` que revierte una transacción previa por su `transaction_id`. También idempotente: revertir dos veces no debe duplicar la reversión. Se implementa como un **asiento de reversión en el ledger** (nunca borrás el asiento original — Cap. 5).

## 3.8 Errores típicos y cómo resolverlos

| Error | Causa | Solución |
|---|---|---|
| Doble débito | Falta idempotencia | `transaction_id` UNIQUE + devolver resultado previo |
| Saldo negativo | Race condition entre dos bets | Bloqueo de fila (`FOR UPDATE`) o constraint `CHECK balance>=0` (Cap. 5) |
| Win perdido | Timeout, callback no llegó | Reintentos del proveedor + reconciliación por `round_id` |
| Firma inválida | Secret mal configurado / payload alterado | Verificar HMAC antes de procesar; loguear y alertar |
| Ronda huérfana | Proveedor cayó a mitad | Job de reconciliación con timeout |
| Token expirado | Sesión vieja | Validar sesión activa en cada callback |
| Rollback duplicado | Reintento de cancelación | Idempotencia también en rollback |

## 3.9 Cómo simulamos todo esto (el `provider-sim`)

El paquete `packages/provider-sim` es un proveedor de juegos falso que **habla el protocolo real**. Es la pieza que hace que tu play money sea arquitectónicamente idéntico a lo real. Qué contiene:

- **Un endpoint `launch`** que devuelve la URL de un juego propio (componentes React: un Dice, un Coinflip, una mini-slot, un crash tipo Aviator, un Mines — inspirados en *Stake Originals* / BGaming).
- **Un RNG** (de juguete, no certificado, pero con la misma *forma*: seed + resultado verificable estilo "provably fair" para que sea educativo y demostrable).
- **Un cliente que golpea tu callback** de wallet con `bet`/`win`/`rollback`, firmando con HMAC, **incluyendo reintentos y timeouts simulados** para que puedas probar tu idempotencia de verdad.
- **Un "modo caos"** configurable: que a propósito duplique callbacks, mande eventos fuera de orden, simule caídas — para testear el sistema contra los escenarios del 3.6-3.7 en CI.

🧩 **COSTURA-REAL:** el día de la licencia, `provider-sim` se reemplaza (o convive) con un **adapter de agregador real** (Cap. 4) que implementa la misma interfaz `GameProviderPort`. Tu wallet, tu catálogo y tu frontend no se enteran del cambio. El "modo caos" queda como suite de tests de resiliencia permanente.


---

# Capítulo 4 — Agregadores

## 4.1 Qué resuelve un agregador

Integrar un proveedor directamente es un proyecto: contrato comercial, due diligence (te piden licencia), integración técnica, certificación, y mantenimiento continuo de esa integración. Multiplicá eso por 14 proveedores y tenés un equipo entero dedicado solo a integraciones.

Un **agregador** se integra una vez con decenas o cientos de proveedores y te expone **una sola API unificada**. Vos integrás el agregador una vez y tenés acceso a todo su catálogo. Es un intermediario técnico (y a veces comercial).

```
   SIN agregador:                 CON agregador:

   Operador ─── Pragmatic         Operador ─── Agregador ─┬─ Pragmatic
      ├──────── Evolution                                 ├─ Evolution
      ├──────── Spribe                                     ├─ Spribe
      ├──────── BGaming                                    ├─ BGaming
      └──────── (11 más...)                                └─ (cientos)
   14 integraciones               1 integración
   14 contratos                   1 contrato
```

## 4.2 Los agregadores del mercado

- **SoftSwiss** — Uno de los más grandes; ofrece plataforma completa + agregación + casino cripto. Suite integral.
- **Slotegrator** — Agregador muy popular, catálogo amplio, orientado a operadores nuevos, buena documentación (APIgrator).
- **EveryMatrix** — Suite modular grande (casino, sports, pagos, PAM). Enterprise.
- **SoftGamings** — Agregación + soluciones llave en mano.
- **Hub88** — Agregador (grupo Yolo) con API muy limpia y muy orientada a developers; referencia técnica de cómo se ve un buen protocolo seamless.
- **Alea** — Agregador con fuerte presencia LatAm.
- **Digitain** — Plataforma completa con fuerte componente sportsbook.
- **Relax Gaming** — Proveedor *y* agregador (su red "Powered By" / "Silver Bullet").
- **GR8 Tech** — Plataforma enterprise (heredera de tecnología de grandes operadores).

## 4.3 Directo vs. agregador — la decisión

**Conviene agregador cuando:**
- Estás empezando y querés catálogo grande rápido.
- No querés mantener 14 integraciones.
- Preferís un solo contrato, una sola conciliación, un solo soporte.
- Tu volumen no justifica el mejor precio por proveedor.

**Conviene directo cuando:**
- Sos grande y el volumen con un proveedor específico justifica negociar mejor rev-share saltando al intermediario.
- Querés features o configuraciones que el agregador no expone.
- Querés control total de la relación (jackpots dedicados, torneos, promos con el proveedor).

**La estrategia real de la mayoría:** híbrida. Agregador para el grueso del catálogo (long tail) + integración directa con los 2-3 proveedores estrella donde el volumen justifica el mejor deal.

| | Agregador | Directo |
|---|---|---|
| Time-to-market | Rápido (semanas) | Lento (meses × N) |
| Costo integración | Bajo (1 vez) | Alto (× proveedor) |
| Rev-share | Peor (paga al intermediario) | Mejor |
| Mantenimiento | Bajo | Alto |
| Control | Menor | Total |
| Requisito | Licencia igual | Licencia + due diligence × proveedor |

## 4.4 Costos aproximados (orientativo, mercado 2026)

Los números varían mucho por jurisdicción, volumen y negociación, pero para calibrar expectativas:
- **Modelo dominante: revenue share sobre GGR** (Gross Gaming Revenue = apuestas − premios). Rango típico agregador: **10–15% del GGR** que generan sus juegos, a veces más para catálogo premium.
- **Setup/integración:** desde gratis (agregadores que quieren captarte) hasta cinco cifras para suites enterprise.
- **Mínimos mensuales** en algunos contratos.
- **Directo con proveedor top:** rev-share negociable, típicamente mejor que vía agregador a volumen, pero con setup y mínimos.

🧩 **COSTURA-REAL #3 (ampliada):** Nada de esto aplica en play money — no hay GGR real ni contratos. Pero tu **catálogo** y tu **capa de integración** se diseñan como si un agregador estuviera detrás. Concretamente, definís una interfaz `GameProviderPort` (launch, callbacks, catálogo, reconciliación) y hoy la implementa `provider-sim`; mañana la implementa `Hub88Adapter` o `SlotegratorAdapter`. El catálogo en tu DB (Cap. 6) ya tiene los campos que un agregador te daría (provider_id, rtp, volatility, thumbnail, categorías) para que importar el catálogo real sea un seed, no un rediseño.

---

# Capítulo 5 — Wallet (el corazón del sistema)

Si hay un capítulo para leer dos veces, es este. El wallet es donde un bug no es "un pixel corrido" sino "aparecieron/desaparecieron fondos". Todo lo demás del casino puede fallar y recuperarse; el wallet no.

## 5.1 Principio fundamental: el saldo es una consecuencia, no un dato

El error mental más común es pensar el saldo como un número que se guarda y se edita: `balance = balance - 10`. **No.** El saldo correcto es una **derivada del ledger**: es la suma de todos los asientos contables del usuario. El número que guardás en la tabla de saldo es un *cache/materialización* de esa suma, mantenido de forma consistente, pero la **fuente de verdad es el ledger de asientos inmutables.**

¿Por qué? Porque si el saldo es solo un número editable, un bug lo corrompe y no hay forma de saber cuál era el correcto. Con un ledger inmutable de doble entrada, el saldo *siempre* se puede recalcular desde cero sumando asientos, y cualquier discrepancia se detecta y audita. Esto es contabilidad de partida doble, y los casinos son, en el fondo, sistemas contables con animaciones lindas encima.

## 5.2 Ledger de doble entrada

Cada movimiento de dinero es una **transacción** compuesta de **asientos** (entries) que **suman cero**. El dinero no aparece ni desaparece: se mueve entre cuentas. Cuentas típicas:

- `player:{id}:cash` — saldo real (ficticio) del jugador
- `player:{id}:bonus` — saldo de bono del jugador
- `house:wagering` — la "casa" (contrapartida de apuestas y premios)
- `house:deposits` — contrapartida de acreditaciones
- `house:bonus_liability` — bonos otorgados pendientes

**Ejemplo: apuesta de $10.** El jugador apuesta; ese dinero sale de su cuenta cash y entra a la casa:
```
Transaction: BET round_555   (suma = 0)
  ┌─────────────────────────────┬─────────┬─────────┐
  │ account                     │  debit  │ credit  │
  ├─────────────────────────────┼─────────┼─────────┤
  │ player:42:cash              │  10.00  │         │
  │ house:wagering              │         │  10.00  │
  └─────────────────────────────┴─────────┴─────────┘
  El saldo del jugador = suma de sus créditos − débitos a su favor.
```
**Ejemplo: premio de $50.** Sale de la casa, entra al jugador:
```
Transaction: WIN round_555   (suma = 0)
  │ house:wagering              │  50.00  │         │
  │ player:42:cash              │         │  50.00  │
```
El saldo del jugador después de bet+win: partió en 100, −10, +50 = **140**. Y ese 140 es *verificable* sumando todos sus asientos, en cualquier momento, para siempre.

⚠️ **TRAMPA #6 — nunca borres ni edites un asiento.** ¿El jugador ganó por error? No editás el asiento del premio. Escribís un **asiento de reversión** (rollback): una nueva transacción que revierte la anterior. El ledger es *append-only*. Esto es lo que hace auditable el sistema y lo que salva discusiones ("me robaste saldo"): mostrás la cadena completa de asientos.

## 5.3 Los cuatro problemas de concurrencia (y sus soluciones)

Acá está la carne. Dos apuestas del mismo jugador llegando *al mismo tiempo* (posible en juegos con multi-bet, o con un cliente buggeado, o un atacante). El jugador tiene $10. Llegan dos bets de $10 simultáneas.

### Problema A — Race condition / lost update
```
  Bet 1 lee saldo=10    Bet 2 lee saldo=10    (ambas leen 10)
  Bet 1: 10-10=0        Bet 2: 10-10=0
  Bet 1 escribe 0       Bet 2 escribe 0
  Resultado: se apostaron $20 con $10. Saldo 0 pero jugó de más.
```

**Solución 1 — Bloqueo pesimista (`SELECT ... FOR UPDATE`).** La primera transacción que llega bloquea la fila del saldo; la segunda **espera** hasta que la primera termine, entonces lee el saldo ya actualizado (0) y correctamente rechaza por fondos insuficientes.
```sql
BEGIN;
SELECT balance FROM wallets WHERE user_id=42 FOR UPDATE; -- bloquea la fila
-- ahora nadie más puede leer-para-actualizar esta fila hasta el COMMIT
-- valido fondos, descuento, escribo ledger
UPDATE wallets SET balance = balance - 1000 WHERE user_id=42;
INSERT INTO ledger_entries ...;
COMMIT; -- libera el lock
```
Este es el enfoque **recomendado para el wallet** por ser simple de razonar y correcto. El costo es que serializa las operaciones sobre un mismo jugador (no sobre jugadores distintos, que siguen en paralelo). Como un jugador no genera miles de bets/segundo, es perfectamente aceptable.

**Solución 2 — Update condicional atómico (defensa en profundidad).** Además del lock, el UPDATE lleva la condición en el propio WHERE, y una constraint CHECK:
```sql
UPDATE wallets SET balance = balance - 1000
  WHERE user_id=42 AND balance >= 1000;
-- si afecta 0 filas → no había fondos → rechazo
```
Más una constraint a nivel tabla que hace **imposible** un saldo negativo, pase lo que pase en el código:
```sql
ALTER TABLE wallets ADD CONSTRAINT balance_non_negative CHECK (balance >= 0);
```
⚠️ **TRAMPA #7 — el saldo negativo debe ser imposible a nivel base de datos, no solo a nivel código.** El código tiene bugs; la constraint CHECK es la última línea de defensa que ninguna race condition puede cruzar. Si una transacción intenta dejar el saldo negativo, Postgres la aborta.

### Problema B — Idempotencia (ya cubierto en Cap. 3, formalizado acá)
Cada operación del proveedor trae `transaction_id`. La tabla `transactions` tiene ese campo **UNIQUE**. El flujo atómico:
```
BEGIN;
  INSERT INTO transactions (provider_tx_id, ...) VALUES ('tx_999', ...);
    -- si viola UNIQUE → ya existía → ROLLBACK, leo la tx previa, devuelvo su resultado
  SELECT balance FROM wallets WHERE user_id=42 FOR UPDATE;
  UPDATE wallets SET balance = balance - amount WHERE user_id=42 AND balance>=amount;
  INSERT INTO ledger_entries (...);  -- doble entrada
COMMIT;
```
Insert-de-transacción + update-de-saldo + asientos, **todo en una transacción de DB**. Atómico: o pasa todo, o nada.

### Problema C — Atomicidad multi-cuenta (bet+win, bonos)
Cuando una operación toca varias cuentas (ej: apuesta que consume parte de cash y parte de bonus), **todos los asientos se escriben en la misma transacción**. Nunca puede quedar "descontó el cash pero no el bonus". La regla de la doble entrada (suma cero) se valida antes del COMMIT: si los asientos no suman cero, es un bug, se aborta.

### Problema D — Deadlocks
Si la transacción 1 bloquea la fila A y quiere la B, y la 2 bloquea B y quiere A → deadlock. Postgres lo detecta y mata una de las dos. **Prevención:** siempre bloquear las filas en un **orden consistente** (ej: por user_id ascendente). Y **manejo:** ante un error de deadlock (`40P01`), reintentar la transacción completa con backoff. El motor de wallet envuelve toda operación en un retry para deadlocks y errores de serialización.

## 5.4 Los tipos de saldo y cómo se modelan

Un casino no tiene un saldo, tiene varios "buckets" con reglas distintas. Todos viven como cuentas en el ledger:

- **Cash / real** (`player:X:cash`) — dinero ficticio depositable y retirable. Se apuesta con prioridad configurable.
- **Bonus** (`player:X:bonus`) — otorgado por promociones. Tiene **wagering requirement** (hay que apostarlo N veces antes de convertirlo en cash). No retirable hasta cumplir el rollover.
- **Free spins** — no es saldo monetario, es un contador de giros gratis en juegos específicos. Los premios de free spins suelen ir al bucket bonus (con wagering).
- **Cashback** — devolución de un % de pérdidas en un período. Se acredita como bonus o como cash según la promo.

**Orden de consumo (wagering priority):** típicamente se apuesta primero el bonus (para que el jugador cumpla rollover) o primero el cash (según estrategia). Es configurable por operador. El wallet debe saber, ante un bet, de qué bucket(s) descontar y en qué orden, y registrarlo en el ledger con las cuentas correctas.

⚠️ **TRAMPA #8 — el wagering requirement es lógica de negocio compleja y fuente de disputas.** Modelalo explícitamente: cada bono tiene un `wagering_target` y un `wagering_progress` que avanza con cada apuesta elegible (¡no todos los juegos contribuyen igual — las slots suelen contar 100%, las mesas 10%!). Guardá el detalle para poder explicarle al jugador exactamente por qué no puede retirar aún.

## 5.5 Free spins, rollback, cashback — flujos

- **Free spins:** el operador otorga N spins en el juego G con valor V. El proveedor (o el simulador) los consume; cada resultado ganador acredita al bucket bonus. Se modela como una entidad `free_spin_grant` con estado (otorgado → en uso → completado/expirado).
- **Rollback:** revierte una transacción por su ID. Escribe asientos inversos. Idempotente (revertir dos veces = una). Se usa cuando una ronda se cancela o un proveedor lo pide.
- **Cashback:** un job programado (BullMQ) calcula pérdidas netas del período por jugador (desde el ledger) y acredita el % configurado. Todo el cálculo sale del ledger — otra razón por la que el ledger es la fuente de verdad.

## 5.6 Interfaz del Wallet Service (el contrato)

El wallet expone una interfaz interna estable. Firmas conceptuales:
```
debit(userId, amount, txId, roundId, meta) → { balance } | InsufficientFunds
credit(userId, amount, txId, roundId, meta) → { balance }
rollback(userId, originalTxId, txId) → { balance }
getBalance(userId) → { cash, bonus, total }
```
Todo lo demás del sistema (games, bonus, admin) usa *esta* interfaz. Nadie hace `UPDATE wallets` por fuera. Esa disciplina es la que hace el sistema auditable y correcto. 🧩 **COSTURA-REAL:** esta misma interfaz sirve para dinero real; lo único que cambia es que detrás aparecen las validaciones extra de KYC/límites (que se inyectan como middleware del wallet), no la mecánica del ledger.


---

# Capítulo 6 — Base de datos

Esquema completo en Postgres, expresado como modelo Prisma conceptual + relaciones. Regla transversal: **dinero siempre en `BigInt` en la unidad mínima** (centavos ficticios), nunca `Float`. Timestamps siempre con zona (`timestamptz`). IDs `uuid` (o `cuid` en Prisma).

## 6.1 Diagrama de relaciones (alto nivel)

```
  users ──1:1── wallets ──1:N── ledger_entries
    │              │                  ▲
    │              └──1:N── transactions ──┘ (una tx agrupa asientos)
    │
    ├──1:N── sessions
    ├──1:N── game_sessions ──1:N── rounds ──1:N── bets
    ├──1:N── bonus_grants ──N:1── bonus_campaigns
    ├──1:N── free_spin_grants
    ├──1:N── kyc_records            ← 🧩 vacía en play money
    ├──1:N── payment_transactions   ← 🧩 fake en play money
    └──1:N── notifications

  providers ──1:N── games ──N:M── categories
  games ──1:N── game_sessions
  jackpots ──N:1── providers
  admin_users ──1:N── audit_logs
  affiliates ──1:N── users
```

## 6.2 Tablas principales (definición)

**users** — identidad y estado de la cuenta
```
id            uuid pk
email         citext unique
username      citext unique
password_hash text            -- argon2id
role          enum(player)    -- players; admins van en admin_users
status        enum(active, suspended, self_excluded, closed)
country       text
vip_level     int default 0
created_at    timestamptz
-- 🧩 campos KYC presentes pero sin uso en play money:
kyc_status    enum(none, pending, verified, rejected) default none
date_of_birth date null
```

**wallets** — saldo materializado (cache del ledger), 1:1 con user
```
id            uuid pk
user_id       uuid fk → users unique
cash_balance  bigint default 0   CHECK (cash_balance >= 0)   -- ⚠️ TRAMPA #7
bonus_balance bigint default 0   CHECK (bonus_balance >= 0)
currency      text default 'FUN'
version       int default 0      -- para optimistic locking opcional
updated_at    timestamptz
```

**transactions** — agrupador de asientos; unidad de idempotencia
```
id                   uuid pk
user_id              uuid fk → users
type                 enum(bet, win, rollback, deposit, withdrawal, bonus_grant, cashback, adjustment)
provider_tx_id       text                     -- ID del proveedor
provider_id          uuid fk → providers null
round_id             uuid fk → rounds null
amount               bigint                   -- monto principal (informativo)
status               enum(pending, completed, reversed)
created_at           timestamptz
UNIQUE (provider_id, provider_tx_id)          -- ⚠️ idempotencia (Cap 5)
```

**ledger_entries** — asientos inmutables de doble entrada (append-only)
```
id             uuid pk
transaction_id uuid fk → transactions
account        text          -- 'player:42:cash', 'house:wagering', ...
direction      enum(debit, credit)
amount         bigint        CHECK (amount > 0)
created_at     timestamptz
-- INVARIANTE (validada en app + test): por transaction_id, Σdebit = Σcredit
-- índice: (account, created_at) para recalcular saldos
```

**sessions** — sesiones de login (auth)
```
id             uuid pk
user_id        uuid fk → users
refresh_token_hash text
user_agent     text
ip             inet
expires_at     timestamptz
revoked        bool default false
created_at     timestamptz
```

**providers** — proveedores de juego (hoy: solo el simulado)
```
id          uuid pk
code        text unique        -- 'sim', mañana 'pragmatic', 'evolution'
name        text
type        enum(direct, aggregator, simulated)
status      enum(active, disabled)
config      jsonb              -- credenciales/endpoints (cifrado, Cap 8)
```

**games** — catálogo
```
id            uuid pk
provider_id   uuid fk → providers
code          text               -- id del juego en el proveedor
name          text
slug          text unique
type          enum(slot, live, crash, table, instant, original)
rtp           numeric(5,2)       -- ej 96.50
volatility    enum(low, medium, high)
thumbnail_url text
is_active     bool
is_featured   bool
release_date  date
sort_order    int
UNIQUE (provider_id, code)
```

**categories** + **game_categories** (N:M) — slots, live, crash, "originals", nuevos, populares...

**game_sessions** — una sesión de juego lanzada (Cap 1.7)
```
id            uuid pk
user_id       uuid fk → users
game_id       uuid fk → games
launch_token  text unique       -- el player_token de los callbacks
status        enum(open, closed)
started_at    timestamptz
ended_at      timestamptz null
```

**rounds** — una ronda de juego (agrupa bet(s) y win(s))
```
id                uuid pk
game_session_id   uuid fk → game_sessions
provider_round_id text
status            enum(open, settled, cancelled)
total_bet         bigint default 0
total_win         bigint default 0
created_at        timestamptz
settled_at        timestamptz null
UNIQUE (game_session_id, provider_round_id)
```

**bets** — apuestas individuales (detalle dentro de una ronda)
```
id           uuid pk
round_id     uuid fk → rounds
user_id      uuid fk → users
amount       bigint
win_amount   bigint default 0
status       enum(placed, won, lost, cancelled)
result_data  jsonb        -- metadata del resultado (símbolos, multiplicador)
created_at   timestamptz
```

**bonus_campaigns** — definición de promociones
```
id                uuid pk
code              text unique
name              text
type              enum(deposit_match, free_spins, cashback, no_deposit)
amount            bigint null
percentage        numeric null
wagering_multiplier int          -- rollover, ej 30x
game_contribution jsonb          -- {slot:100, table:10, live:10}
valid_from/valid_to timestamptz
status            enum(active, paused, ended)
```

**bonus_grants** — bono otorgado a un usuario
```
id                uuid pk
user_id           uuid fk → users
campaign_id       uuid fk → bonus_campaigns
amount            bigint
wagering_target   bigint         -- amount * multiplier
wagering_progress bigint default 0
status            enum(active, completed, expired, forfeited)
expires_at        timestamptz
```

**free_spin_grants**
```
id          uuid pk
user_id     uuid fk → users
game_id     uuid fk → games
spins_total int
spins_used  int default 0
spin_value  bigint
status      enum(active, completed, expired)
expires_at  timestamptz
```

**jackpots** — progresivos (simulados con contador en Redis + snapshot en DB)
```
id            uuid pk
provider_id   uuid fk → providers null
name          text
type          enum(fixed, progressive)
current_amount bigint
seed_amount   bigint
last_won_at   timestamptz null
last_won_by   uuid null
```

**payment_transactions** — 🧩 depósitos/retiros. En play money son fake (botón acredita FUN)
```
id          uuid pk
user_id     uuid fk → users
type        enum(deposit, withdrawal)
amount      bigint
method      text default 'fake'       -- mañana: 'card','crypto','transfer'
status      enum(pending, completed, failed)
psp_ref     text null                 -- 🧩 referencia del PSP real
created_at  timestamptz
```

**kyc_records** — 🧩 vacía/no usada en play money, presente para no migrar esquema después
```
id, user_id, document_type, document_ref, status, reviewed_by, reviewed_at
```

**notifications**, **audit_logs**, **admin_users**, **affiliates**, **settings** (config key-value con historial), **events** (event log para analytics / event sourcing ligero de dominio).

## 6.3 Decisiones de modelado que importan

- **Dinero en `bigint` (unidad mínima).** `numeric` en el ledger para agregaciones exactas; en la app se maneja como entero de centavos. Jamás float. ⚠️ **TRAMPA #9:** `0.1 + 0.2 != 0.3` en floating point; con dinero eso es plata que se evapora.
- **Append-only donde importa:** `ledger_entries`, `audit_logs`, `events` nunca se hacen UPDATE/DELETE. Correcciones = nuevos registros.
- **Particionado futuro:** `transactions`, `bets`, `ledger_entries`, `events` crecen sin límite. Se particionan por rango de fecha (`created_at`) cuando el volumen lo pida. El esquema ya lo contempla (created_at indexado).
- **Índices críticos:** `transactions(provider_id, provider_tx_id)` UNIQUE (idempotencia), `ledger_entries(account, created_at)` (recálculo de saldo), `game_sessions(launch_token)` (resolución de callbacks), `bets(user_id, created_at)` (historial).
- **Separación admin_users / users:** los administradores NO son usuarios con un flag; son otra tabla con su propio ciclo de vida, permisos y auditoría. Mezclarlos es un agujero de seguridad clásico.

---

# Capítulo 7 — APIs

Convenciones: REST sobre HTTPS, JSON, versionado `/api/v1`. Auth por `Authorization: Bearer <access_token>` (JWT corto) + refresh token en cookie httpOnly. Errores con forma estándar `{ error: { code, message, details } }`. Montos en unidad mínima (centavos FUN).

## 7.1 Auth

**POST /api/v1/auth/register**
```json
// req
{ "email": "ana@mail.com", "username": "ana", "password": "••••••••" }
// res 201
{ "user": { "id": "usr_...", "username": "ana", "vipLevel": 0 },
  "accessToken": "eyJ...", "expiresIn": 900 }
// (refresh token va en cookie httpOnly Secure SameSite=Strict)
```

**POST /api/v1/auth/login**
```json
{ "email": "ana@mail.com", "password": "••••••••" }
→ { "user": {...}, "accessToken": "eyJ...", "expiresIn": 900 }
```

**POST /api/v1/auth/refresh** → nuevo accessToken (usa la cookie).
**POST /api/v1/auth/logout** → revoca la sesión.

## 7.2 Wallet / Balance

**GET /api/v1/wallet/balance**
```json
→ { "cash": 90000, "bonus": 5000, "total": 95000, "currency": "FUN" }
```

**GET /api/v1/wallet/transactions?type=bet&cursor=...&limit=20** (historial de transacciones)
```json
→ { "items": [
     { "id":"tx_...", "type":"bet", "amount":1000, "status":"completed",
       "roundId":"rnd_...", "game":"Sweet Bonanza", "createdAt":"2026-..." }
   ], "nextCursor": "..." }
```

## 7.3 Depósito/retiro (🧩 fake en play money)

**POST /api/v1/payments/deposit**
```json
// play money: acredita FUN al instante
{ "amount": 100000 }
→ { "transactionId":"pay_...", "status":"completed", "newBalance":190000 }
// 🧩 real: crearía una intención de pago en el PSP y devolvería
//     una URL/clientSecret; el crédito llega por webhook del PSP.
```

## 7.4 Juegos

**GET /api/v1/games?category=slots&provider=sim&search=bonanza&cursor=...**
```json
→ { "items":[ { "id":"gm_...", "name":"Sweet Bonanza", "slug":"sweet-bonanza",
     "provider":"sim", "type":"slot", "rtp":96.5, "thumbnail":"...",
     "isFeatured":true } ], "nextCursor":"..." }
```

**POST /api/v1/games/launch**
```json
{ "gameId": "gm_..." }
→ { "gameUrl": "https://.../sim/play/tok_abc", "sessionId":"gs_...",
    "launchToken":"tok_abc" }
```

**GET /api/v1/games/favorites** · **POST /api/v1/games/{id}/favorite** · **GET /api/v1/games/recent**

## 7.5 Callback del proveedor (server-to-server, NO expuesto al browser)

**POST /provider/v1/callback** — el endpoint que golpea el proveedor/simulador. Firma HMAC obligatoria.
```json
// bet
{ "action":"bet", "token":"tok_abc", "amount":1000, "roundId":"prv_r_5",
  "transactionId":"prv_tx_9", "gameCode":"sweet_bonanza",
  "timestamp":1736800000, "hash":"<hmac_sha256>" }
→ { "status":"OK", "balance":89000, "transactionId":"prv_tx_9" }
→ // o { "status":"INSUFFICIENT_FUNDS", "balance":500 }

// win
{ "action":"win", "token":"tok_abc", "amount":5000, "roundId":"prv_r_5",
  "transactionId":"prv_tx_10", "hash":"..." }
→ { "status":"OK", "balance":94000 }

// rollback
{ "action":"rollback", "token":"tok_abc", "referenceTransactionId":"prv_tx_9",
  "transactionId":"prv_tx_11", "hash":"..." }
→ { "status":"OK", "balance":90000 }

// balance
{ "action":"balance", "token":"tok_abc", "hash":"..." }
→ { "status":"OK", "balance":90000, "currency":"FUN" }
```
Códigos de estado del protocolo (no HTTP): `OK`, `INSUFFICIENT_FUNDS`, `INVALID_TOKEN`, `TRANSACTION_NOT_FOUND` (rollback de algo inexistente), `INTERNAL_ERROR`. El HTTP status suele ser 200 incluso en errores de negocio; el error real va en el body (así lo esperan la mayoría de los protocolos de proveedor).

## 7.6 Bonos / Free spins

**GET /api/v1/bonuses** (activos del usuario, con progreso de wagering)
```json
→ { "items":[ { "id":"bg_...", "name":"Welcome 100%", "type":"deposit_match",
     "amount":50000, "wageringTarget":1500000, "wageringProgress":420000,
     "progressPct":28, "expiresAt":"2026-..." } ] }
```
**POST /api/v1/bonuses/{campaignCode}/claim** · **GET /api/v1/free-spins**

## 7.7 Perfil / cuenta

**GET /api/v1/me** · **PATCH /api/v1/me** (avatar, prefs) · **POST /api/v1/me/password** ·
**GET /api/v1/me/vip** (nivel, progreso, beneficios) · **GET /api/v1/me/notifications**

## 7.8 Admin (autenticación separada, prefijo /admin, permisos por rol)

`GET /admin/v1/users`, `GET /admin/v1/users/{id}` (con ledger completo),
`POST /admin/v1/users/{id}/adjust` (ajuste manual de saldo → escribe asiento `adjustment` auditado),
`GET /admin/v1/withdrawals?status=pending`, `POST /admin/v1/withdrawals/{id}/approve|reject`,
`GET /admin/v1/reports/ggr?from=&to=`, `GET /admin/v1/providers`, `POST /admin/v1/games/{id}/toggle`,
`GET /admin/v1/audit-logs`, `POST /admin/v1/bonuses/campaigns`.

## 7.9 KYC / Afiliados (🧩 / parcial en play money)

`POST /api/v1/kyc/documents` (🧩 stub), `GET /api/v1/affiliate/stats` (referidos, comisiones ficticias).


---

# Capítulo 8 — Seguridad

La seguridad de un casino tiene dos frentes: proteger la **plataforma** (ataques web clásicos) y proteger la **integridad económica** (que nadie fabrique saldo o manipule resultados). El segundo frente es el que distingue a un casino de cualquier otra app.

## 8.1 Autenticación y sesiones

- **Passwords:** hash con **Argon2id** (no bcrypt salvo restricción; nunca SHA/MD5). Parámetros de costo ajustados al hardware.
- **JWT de acceso corto (5–15 min) + refresh token largo.** El access token es *stateless* (rápido de validar, no toca DB). El refresh token es *stateful*: su hash vive en `sessions`, se puede **revocar** (logout, cambio de contraseña, actividad sospechosa). El access token va en memoria del cliente; el refresh en **cookie httpOnly + Secure + SameSite=Strict** (inaccesible a JS → mitiga XSS robando la sesión).
- **Rotación de refresh tokens:** cada refresh emite uno nuevo e invalida el anterior. Si un token ya usado reaparece → posible robo → se revoca toda la familia de sesiones.
- **2FA (TOTP)** disponible para el usuario y **obligatorio para admins**.

## 8.2 Autorización

- **RBAC** (control por roles). Players, y del lado admin: soporte, riesgo, finanzas, super-admin — cada rol con permisos mínimos (principio de menor privilegio).
- **Verificación de propiedad:** el usuario X solo accede a *sus* recursos. Un `GET /wallet/transactions` filtra siempre por el `user_id` del token, nunca por un id que venga en el request. ⚠️ **TRAMPA #10 (IDOR):** nunca confíes en un id de recurso que venga del cliente sin verificar pertenencia. Es la vulnerabilidad #1 en apps con dinero.

## 8.3 Integridad económica (lo específico del casino)

- **HMAC en callbacks de proveedor** (Cap. 3.4): firma verificada con `timingSafeEqual` antes de procesar. Sin esto, cualquiera que descubra tu endpoint fabrica saldo.
- **API Keys/secrets por proveedor**, almacenados cifrados (ver 8.7), rotables.
- **El resultado del juego nunca lo decide el cliente.** El browser manda "quiero girar"; el resultado lo calcula el proveedor/simulador server-side. Un cliente que dice "gané" no acredita nada; solo un `win` firmado server-to-server mueve saldo.
- **Idempotencia y ledger** (Cap. 5) — son también controles de seguridad: hacen imposible el doble gasto y dejan traza de todo.
- **Validación de límites de apuesta** server-side (min/max por juego).

## 8.4 Ataques web y mitigaciones

| Ataque | Mitigación |
|---|---|
| **SQL Injection** | ORM parametrizado (Prisma) siempre; nunca concatenar SQL. En SQL crudo, parámetros ligados. |
| **XSS** | React escapa por defecto; CSP estricta; sanitizar cualquier HTML de usuario (chat); cookie httpOnly. |
| **CSRF** | SameSite=Strict en cookies + token anti-CSRF en operaciones sensibles; APIs con Bearer no usan cookies para auth de API. |
| **Clickjacking** | `X-Frame-Options`/CSP `frame-ancestors` (ojo: los juegos van en iframe, así que se permite solo el origen del proveedor). |
| **Rate abuse / brute force** | Rate limiting por IP y por cuenta (Redis); backoff exponencial en login; captcha tras N fallos. |
| **Bots / scraping** | Cloudflare Bot Management, challenges, device fingerprinting. |
| **DDoS** | Cloudflare en el borde; autoscaling; circuit breakers. |
| **Enumeración de usuarios** | Respuestas de login/registro que no revelan si el email existe. |

## 8.5 Prevención de fraude (antifraude)

- **Detección de multicuentas:** fingerprint de dispositivo, correlación de IP, patrones de comportamiento. (En play money es más una demo de capacidad; en real es crítico para abuso de bonos.)
- **Abuso de bonos:** reglas de elegibilidad, límites de bono por dispositivo/IP, detección de "bonus hunting" (patrones de apuesta que solo buscan cumplir rollover con mínimo riesgo).
- **Velocity checks:** demasiadas acciones en poco tiempo → flag.
- **Reglas de riesgo configurables** en el backoffice (Cap. 11) que levantan casos para revisión manual.

🧩 **COSTURA-REAL:** en dinero real esto se conecta con AML (monitoreo de transacciones, reportes de operaciones sospechosas) y con el PSP. En play money implementás el *motor de reglas* y las *alertas* (útil y demostrable), sin la parte de reporte legal.

## 8.6 Rate limiting y WAF

- **Cloudflare WAF** con reglas OWASP + reglas propias.
- **Rate limit en capas:** borde (Cloudflare) + aplicación (Redis, por endpoint/usuario/IP). Límites distintos: login estricto, callbacks de proveedor generosos pero monitoreados, APIs de juego moderadas.

## 8.7 Secretos, cifrado y rotación

- **Secret manager:** nunca secretos en el código ni en `.env` commiteado. Uso de un gestor (Doppler, HashiCorp Vault, o el secret manager del cloud) inyectando en runtime.
- **Cifrado en tránsito:** TLS everywhere (Cloudflare + interno).
- **Cifrado en reposo:** disco de la DB cifrado; campos sensibles (config de proveedor, futuros datos KYC) cifrados a nivel aplicación con clave del secret manager.
- **Rotación de claves:** JWT signing keys rotables (soportar múltiples keys activas con `kid` en el header para rotar sin invalidar sesiones); secrets de proveedor rotables sin downtime.
- **Logs sin PII/secretos:** nunca loguear passwords, tokens, ni payloads con secretos. Los `hash` de callbacks se loguean redactados.

## 8.8 Auditoría

Todo lo sensible (login admin, ajuste de saldo, aprobación de retiro, cambio de config, toggle de juego) escribe en `audit_logs` (append-only): quién, qué, cuándo, desde dónde, valores antes/después. Es la diferencia entre "creemos que pasó X" y "sabemos exactamente qué pasó".

---

# Capítulo 9 — Real-time

## 9.1 Qué necesita ser tiempo real

- **Actualización de saldo** tras cada bet/win (el jugador ve su saldo cambiar sin refrescar).
- **Notificaciones** (bono otorgado, retiro aprobado, nivel VIP subido).
- **Jackpots** (contador subiendo, alguien ganó).
- **Leaderboards** (torneos, ranking en vivo).
- **Crash games** (el multiplicador de Aviator subiendo — el caso más exigente de real-time).
- **Chat** (comunidad; opcional).

## 9.2 Tecnología y topología

**Socket.IO sobre el backend Nest** (Gateway) al inicio. Autenticación del socket con el JWT (handshake). Canales/rooms por usuario (`user:{id}`) y globales (`jackpots`, `leaderboard:{tournamentId}`).

```
                 ┌───────────────────────────┐
   Browser ──WS──┤  Nest WS Gateway           │
                 │  rooms: user:42, jackpots  │
                 └────────────┬──────────────┘
                              │ (al escalar: >1 instancia)
                    ┌─────────┴─────────┐
                    │  Redis Pub/Sub    │  Socket.IO Redis adapter
                    └───────────────────┘
   El wallet, tras un credit, publica evento →
   Redis → llega a la instancia donde está el socket del user → push
```

## 9.3 Flujo: actualización de saldo en tiempo real

```
1. Callback win procesado por el wallet (Postgres, atómico)
2. Wallet emite evento de dominio "balance.changed {userId, newBalance}"
   (por el bus interno; al escalar, publica en Redis)
3. WS Gateway escucha, hace push a room user:{id}
4. Browser recibe { type:"balance", cash, bonus } y actualiza la UI
   (con TanStack Query: se actualiza la cache, la UI reacciona)
```

⚠️ **TRAMPA #11 — el WebSocket es para *notificar*, no es la fuente de verdad.** Si el WS se cae, el saldo sigue siendo correcto en la DB. El cliente, al reconectar, hace un `GET /wallet/balance` para resincronizar. Nunca dejes que el estado del cliente dependa solo de haber recibido todos los mensajes WS (se pierden mensajes). Patrón: **push optimista + verdad por REST al reconectar.**

## 9.4 Crash game / Aviator (el caso difícil)

Un crash game es un estado global compartido en tiempo real: todos ven el mismo multiplicador subiendo, apuestan antes de que arranque, y cobran (cashout) antes de que "explote". Requisitos:
- **Un tick loop server-side** autoritativo (el multiplicador lo calcula el servidor, no el cliente).
- **Broadcast** del tick a todos los espectadores (room global del juego).
- **Cashout con timestamp server-side** (el momento del cashout lo decide el servidor al recibir el click, no el cliente — si no, se hace trampa cobrando "en el pico").
- El "punto de explosión" se determina con RNG **antes** de arrancar la ronda (provably fair: hash publicado antes, seed revelado después) y se mantiene secreto hasta que ocurre.

En el simulador esto es un mini-servicio de estado dentro del provider-sim, ideal para demostrar dominio de real-time.

---

# Capítulo 10 — Panel administrador

App separada (`apps/admin`), auth separada, en subdominio propio, detrás de restricción de IP/2FA. Qué incluye:

- **Dashboard / KPIs:** usuarios activos, GGR (apuestas − premios, ficticio), depósitos/retiros del día, juegos más jugados, retención, NGR, saldo total en circulación. Gráficos en vivo.
- **Gestión de usuarios:** buscar, ver perfil completo, **ver el ledger completo** de un usuario (cada asiento), estado de cuenta, historial de apuestas y transacciones, sesiones activas, notas.
- **Ajustes de saldo:** acreditar/debitar manualmente (siempre vía wallet → asiento `adjustment` auditado, nunca UPDATE directo). Requiere razón y queda en `audit_logs`.
- **Retiros:** cola de retiros pendientes, aprobar/rechazar (🧩 fake en play money, pero el flujo de aprobación es real y demostrable).
- **Bonos:** crear/editar campañas, otorgar bonos manuales, ver quién tiene qué bono y su progreso de wagering.
- **Proveedores y juegos:** activar/desactivar juegos, destacar, reordenar catálogo, ver estado de proveedores (health de callbacks), editar RTP/categorías.
- **Configuraciones:** settings globales (límites, monedas, features flags), con historial de cambios.
- **Reportes:** GGR por período/juego/proveedor, actividad de usuarios, efectividad de bonos, exportables (CSV).
- **Alertas:** casos de riesgo/fraude levantados por el motor de reglas, saldos anómalos, proveedores caídos.
- **Logs y auditoría:** buscador sobre `audit_logs` y `events`.

Todo permiso segmentado por rol (un agente de soporte no aprueba retiros; finanzas sí; nadie edita RTP salvo super-admin).

---

# Capítulo 11 — Backoffice (herramientas operativas por rol)

El backoffice es el panel admin visto desde los *flujos de trabajo* de cada equipo:

- **Soporte:** ver cuenta del jugador, historial, resetear password, responder tickets, otorgar bono de cortesía (dentro de límites), ver por qué un retiro está trabado o por qué un bono no libera (necesita ver el detalle de wagering).
- **Riesgo/Fraude:** cola de alertas, herramientas de investigación (correlación de cuentas por device/IP), congelar cuenta, marcar para revisión, reglas configurables (velocity, patrones de bono).
- **Finanzas:** conciliación (que el ledger cuadre), reportes de GGR/NGR, aprobación de retiros grandes, ajustes contables auditados.
- **Moderación:** chat/comunidad, reportes de usuarios, bans.
- **Operaciones/Marketing:** campañas de bono, banners, torneos, gestión del catálogo y destacados.

El diseño clave: cada rol ve **solo lo que necesita**, con las acciones que su función permite, y **todo lo que hace queda auditado**. El backoffice no es una pantalla, es el conjunto de permisos + vistas + workflows sobre el mismo sistema.


---

# Capítulo 12 — Complicaciones reales (y cómo resolver cada una)

La lista larga que pediste. Cada problema con su causa raíz y su solución concreta. Muchos ya se tocaron; acá quedan consolidados como referencia.

1. **Timeouts en callbacks.** *Causa:* red lenta, tu backend saturado. *Solución:* idempotencia + reintentos con backoff del lado proveedor + timeouts generosos en operaciones de wallet + monitoreo de latencia. La apuesta se completa tarde pero correcta.

2. **Doble descuento (doble bet).** *Causa:* reintento sin idempotencia. *Solución:* `provider_tx_id` UNIQUE; si ya existe, devolver resultado previo sin re-descontar (Cap. 5.3).

3. **Doble crédito (doble win).** *Causa:* reintento de win. *Solución:* misma idempotencia sobre el tx_id del win.

4. **Balance negativo.** *Causa:* race condition entre bets concurrentes. *Solución:* `SELECT FOR UPDATE` + `UPDATE ... WHERE balance>=amount` + constraint `CHECK(balance>=0)` (triple defensa, Cap. 5.3).

5. **Wallet inconsistente (el número no cuadra).** *Causa:* alguien escribió saldo por fuera del wallet service, o un bug. *Solución:* el saldo es derivable del ledger; job de conciliación que recalcula `Σ asientos` vs. `wallets.balance` y alerta ante discrepancia. Nadie escribe saldo salvo el wallet service.

6. **Caída del proveedor a mitad de ronda.** *Causa:* el proveedor se cae con una ronda abierta. *Solución:* job de reconciliación que, pasado un timeout, consulta el estado de rondas `open` contra el endpoint de reconciliación del proveedor y resuelve (settle o rollback).

7. **Latencia alta.** *Causa:* DB lenta, N+1 queries, falta de cache. *Solución:* índices correctos, cache de lecturas calientes en Redis, connection pooling (PgBouncer), evitar N+1 (Prisma `include`/`select` deliberado), medir con OpenTelemetry.

8. **Desincronización de balance UI vs. real.** *Causa:* mensaje WS perdido. *Solución:* resync por REST al reconectar; el WS notifica pero la verdad es la DB (Cap. 9.3).

9. **Jackpots.** *Causa:* pool compartido, condiciones de carrera al ganar. *Solución:* incremento atómico del pool (Redis `INCRBY` o fila con lock); el pago del jackpot es una transacción de wallet como cualquier otra, idempotente; snapshot periódico a DB.

10. **Cancelaciones / rollback.** *Causa:* ronda anulada. *Solución:* asiento de reversión (nunca borrar), idempotente por tx_id del rollback (Cap. 5.5).

11. **Reconexión de WebSocket.** *Causa:* red móvil, cambio de red. *Solución:* reconexión automática con backoff, re-auth en el handshake, re-join de rooms, resync de estado por REST.

12. **Reintentos que se acumulan.** *Causa:* proveedor reintenta agresivo mientras tu backend ya procesó. *Solución:* idempotencia hace inocuos los reintentos; responder rápido el OK para cortar la cadena de reintentos.

13. **Eventos fuera de orden (win antes que bet).** *Causa:* red. *Solución:* vincular por `round_id`; el win no depende del bet para aplicarse (acreditar no falla por fondos); reconciliar por ronda (Cap. 3.6).

14. **Deadlocks.** *Causa:* dos transacciones bloqueando filas en orden opuesto. *Solución:* orden de bloqueo consistente (por user_id) + retry automático ante error de deadlock (Cap. 5.3-D).

15. **Race conditions generales.** *Solución:* transacciones con nivel de aislamiento adecuado (`SERIALIZABLE` o `REPEATABLE READ` según el caso) + locks de fila + operaciones atómicas + retry ante fallo de serialización.

16. **Webhooks/callbacks perdidos.** *Causa:* tu endpoint estaba caído. *Solución:* el proveedor reintenta (esperado); del lado tuyo, cola de eventos entrantes persistida (inbox pattern) para no perder nada aunque el procesamiento falle; reconciliación periódica como red de seguridad.

17. **Errores de red intermitentes.** *Solución:* circuit breakers hacia el proveedor, timeouts, retries con jitter, degradación elegante (si un proveedor está caído, ocultá sus juegos en vez de mostrar errores).

18. **Idempotencia mal implementada (solo chequea, no atómica).** *Causa:* "primero verifico si existe, luego inserto" → hay una ventana de carrera entre el check y el insert. *Solución:* confiar en la constraint UNIQUE + INSERT y manejar la violación, no en un SELECT previo. La atomicidad la da la DB, no tu `if`.

19. **Dinero en float.** *Solución:* enteros de unidad mínima siempre (Cap. 6.3).

20. **Zona horaria / DST.** *Causa:* timestamps sin zona, cálculos de cashback/período mal. *Solución:* `timestamptz` siempre, UTC en la DB, conversión solo en presentación.

21. **Migraciones peligrosas en producción.** *Causa:* alterar tablas enormes bloquea. *Solución:* migraciones en pasos compatibles hacia atrás (expand/contract), índices `CONCURRENTLY`, nunca un `ALTER` bloqueante en tabla caliente sin ventana.

22. **Crecimiento sin límite de tablas de eventos/apuestas.** *Solución:* particionado por fecha + política de retención/archivado.

23. **Bono que no libera (disputa de usuario).** *Causa:* lógica de wagering opaca. *Solución:* progreso de wagering explícito y auditable, con contribución por tipo de juego; mostrarlo al usuario y al soporte con detalle.

24. **Abuso de bonos.** *Solución:* motor de reglas antifraude (Cap. 8.5).

25. **Secretos filtrados en logs/repo.** *Solución:* secret manager, scanning de secretos en CI, logs redactados (Cap. 8.7).

26. **Thundering herd al invalidar cache.** *Causa:* expira la cache de algo popular y mil requests van a la DB a la vez. *Solución:* cache con jitter en TTL, locks de recomputación (un solo request recalcula, el resto espera), stale-while-revalidate.

27. **Reloj/seed de "provably fair" predecible.** *Solución:* seeds server-side seguros, hash publicado antes de la ronda, seed revelado después, verificable por el jugador.

---

# Capítulo 13 — Despliegue

## 13.1 Contenedores

Todo dockerizado. Imágenes multi-stage (build → runtime mínimo). Un `docker-compose.yml` para desarrollo local levanta todo el stack: `api`, `web`, `admin`, `postgres`, `redis`, `provider-sim`, `nginx`, más observabilidad opcional.

```
services:
  postgres   → volumen persistente, healthcheck
  redis      → persistencia AOF
  api        → NestJS, depends_on postgres+redis, migraciones al arrancar
  web        → Next.js
  admin      → Next.js (admin)
  provider-sim → el proveedor simulado
  nginx      → reverse proxy
  # observabilidad (opcional en dev):
  prometheus, grafana, (sentry es SaaS o self-host)
```

## 13.2 Orquestación — ¿Kubernetes?

**Honestidad sobre K8s:** para play money / portfolio, **K8s es opcional y probablemente overkill al inicio.** Un solo VPS con Docker Compose, o un servicio tipo Render/Railway/Fly.io, te alcanza para demostrar todo. K8s aporta cuando tenés que escalar horizontalmente en serio, con múltiples réplicas, autoscaling y alta disponibilidad — escenario de producción real con tráfico.

**Recomendación por etapa:**
- **Portfolio/demo:** Docker Compose en un VPS, o PaaS. Simple, barato, suficiente.
- **Camino a producción real:** K8s (managed: EKS/GKE/DigitalOcean K8s) con Deployments para api/web/admin, HPA (autoscaling por CPU/latencia), PostgreSQL gestionado (no en K8s — usá un managed DB con réplicas y backups), Redis gestionado, Ingress + cert-manager.

Como el sistema es un monolito modular stateless (el estado vive en Postgres/Redis), escalar es "más réplicas del api detrás del balanceador" — trivial en cualquiera de los dos mundos. El WS necesita el Redis adapter para funcionar multi-réplica (Cap. 9.2).

## 13.3 Base de datos y cache en producción

- **PostgreSQL gestionado** con réplica de lectura, backups automáticos + PITR (point-in-time recovery), connection pooling (PgBouncer).
- **Redis gestionado** con persistencia y, si hace falta HA, Redis Sentinel/Cluster.
- **Backups probados:** un backup que nunca restauraste no es un backup. Restore periódico a un entorno de prueba.

## 13.4 Borde y CDN

Cloudflare: DNS, CDN de assets, WAF, DDoS, rate limit de borde, TLS. Assets estáticos de Next.js y thumbnails de juegos servidos por CDN.

## 13.5 CI/CD (GitHub Actions)

Pipeline:
```
push/PR →
  1. lint (eslint) + typecheck (tsc)
  2. tests unitarios (wallet, idempotencia, ledger — cobertura alta obligatoria)
  3. tests de integración (con postgres+redis efímeros en el runner)
  4. tests de resiliencia (provider-sim en "modo caos": duplicados, timeouts)
  5. build de imágenes Docker
  6. (main) migraciones + deploy a staging → smoke tests → deploy a prod
```
Migraciones automáticas pero **expand/contract** (Cap. 12.21). Secrets desde el secret manager, nunca en el repo. Despliegue con estrategia rolling / blue-green para cero downtime.

## 13.6 Observabilidad

- **Prometheus + Grafana:** métricas de sistema (CPU, memoria, latencia p50/p95/p99 por endpoint) y de negocio (bets/seg, GGR, callbacks fallidos, latencia hacia proveedor, saldo total en circulación). Dashboards y alertas.
- **Sentry:** captura de errores con stacktrace y contexto (sin PII/secretos).
- **OpenTelemetry:** trazas distribuidas — seguir una apuesta a través de request → wallet → DB → WS. Imprescindible para debuggear "a este usuario le pasó algo raro".
- **Alertas:** callbacks fallando > umbral, latencia de wallet alta, discrepancia de conciliación, proveedor caído, saldo total variando de forma anómala.

## 13.7 Health checks y resiliencia

Endpoints `/health` (liveness) y `/ready` (readiness: DB y Redis accesibles). Circuit breakers hacia proveedores. Graceful shutdown (terminar requests en curso antes de morir). Rate limiting. Todo lo del Cap. 12 aplicado.


---

# Capítulo UX — Experiencia inspirada en Stake (como referencia, con identidad propia)

Pediste tomar la UX de Stake como *inspiración*, no como copia. Este capítulo analiza por qué su experiencia es referencia de la industria, cómo lograr un nivel similar con tecnología moderna, y qué mejorarías.

## UX.1 Por qué la UX de Stake es una referencia

No es una sola cosa; es la suma de decisiones coherentes:

1. **Velocidad percibida como característica principal.** Todo responde instantáneo: navegación, apertura de juegos, actualización de saldo. La sensación de que "no esperás nunca" es el diferenciador. Se logra con prefetching agresivo, transiciones sin recarga (SPA), y feedback optimista (la UI reacciona antes de que el servidor confirme, y se corrige si hace falta).
2. **Minimalismo funcional.** Interfaz oscura, densa pero ordenada, sin ruido decorativo. Cada elemento tiene función. El foco está en el juego y el saldo, no en adornos.
3. **Mobile-first real.** No es un desktop encogido: la experiencia se diseña para el pulgar, con navegación inferior, targets grandes, y el catálogo optimizado para scroll vertical.
4. **Coherencia total.** Un solo sistema de diseño, mismos patrones en todas las pantallas. El usuario aprende la interfaz una vez.
5. **Juegos "originals" propios** con provably fair — juegos simples (dice, plinko, mines, crash) que cargan al instante y transmiten transparencia (podés verificar que no hay trampa). Esto es clave y es exactamente lo que tu `provider-sim` puede replicar de entrada.
6. **Fricción mínima en lo que importa:** apostar, ver saldo, cambiar de juego. Fricción adecuada en lo sensible (retiros, seguridad).

## UX.2 Cómo lograr ese nivel con el stack elegido

| Objetivo de UX | Cómo se logra técnicamente |
|---|---|
| Carga instantánea de juegos | Prefetch del launch al hacer hover/focus; skeleton screens; iframe precalentado; thumbnails vía CDN con `next/image` |
| Interfaz extremadamente rápida | Next.js App Router + Server Components (menos JS al cliente); code splitting por ruta; TanStack Query cacheando todo |
| Navegación fluida | Transiciones sin recarga; rutas prefetcheadas; estado preservado entre vistas |
| Saldo en tiempo real | WebSocket push + update optimista + resync REST (Cap. 9) |
| Animaciones suaves | Framer Motion con animaciones a 60fps sobre `transform`/`opacity` (nunca sobre layout); respetando `prefers-reduced-motion` |
| Modo oscuro | Design tokens (CSS variables) con tema oscuro por defecto; Tailwind v4 |
| Buscador de juegos | Búsqueda instantánea (debounce + índice en Redis o búsqueda full-text en Postgres); resultados mientras escribís |
| Favoritos / recientes | Endpoints dedicados (Cap. 7.4) + cache local optimista |
| Dashboard intuitivo | Layout con navegación persistente, secciones claras (destacados, categorías, proveedores, recientes) |

## UX.3 Componentes de producto (inventario)

Diseño y arquitectura de cada uno, pensados para tu plataforma:

- **Dashboard/Lobby:** hero con banners promocionales (carrusel liviano), fila de "Continuar jugando" (recientes), destacados, categorías (slots, live, crash, originals), proveedores, "nuevos", "populares". Todo en filas con scroll horizontal en mobile.
- **Buscador:** overlay full-screen en mobile, instantáneo, con recientes y sugeridos cuando está vacío.
- **Favoritos y recientes:** accesibles en un tab; sincronizados con la cuenta.
- **Ficha/launch de juego:** apertura inmediata en iframe, con controles de la plataforma alrededor (saldo, favorito, pantalla completa).
- **Wallet/saldo siempre visible:** en el header (desktop) y accesible en un tap (mobile), con desglose cash/bonus.
- **Bonificaciones:** vista de bonos activos con barra de progreso de wagering clara (transparencia = confianza).
- **Sistema VIP / recompensas:** niveles con progreso visible, beneficios por nivel, cashback. Gamificación (progreso, hitos).
- **Cashback:** vista de devolución acumulada y cuándo se acredita.
- **Historial de apuestas:** lista filtrable por juego/fecha/resultado, con detalle de cada ronda (y verificación provably fair en los originals).
- **Historial de transacciones:** depósitos, retiros, bonos, ajustes — con estados claros.
- **Centro de notificaciones:** feed de eventos (bono, retiro, VIP), con no-leídas.
- **Perfil y configuración:** datos, avatar, seguridad (2FA, sesiones activas), preferencias, y 🧩 (en real) límites de juego responsable.
- **Panel admin profesional:** Cap. 10 — data-dense, rápido, con tablas potentes (filtros, orden, exportar), gráficos, y flujos de aprobación.

## UX.4 Qué mejorarías sobre el modelo (tus diferenciadores)

Acá está el valor de "identidad propia" — mejoras concretas sobre el modelo de referencia:

1. **Rendimiento aún mayor con Server Components.** Aprovechar Next.js 15 para enviar menos JavaScript que una SPA tradicional, ganando en dispositivos de gama baja (importante en LatAm). Ventaja real de usar tecnología 2026.
2. **Transparencia de bonos superior.** El punto de máxima frustración en casinos es "por qué no puedo retirar". Una UI de wagering excepcionalmente clara (qué falta, qué juegos cuentan y cuánto, cuánto llevás) es un diferenciador de confianza barato de construir.
3. **Onboarding y "modo demo" sin fricción.** Como sos play money, esto es literal: cualquiera prueba los juegos al instante. Convertí eso en ventaja de producto (ideal para portfolio y para que el cliente demuestre la plataforma).
4. **Accesibilidad real** (contraste, navegación por teclado, `prefers-reduced-motion`, ARIA): la mayoría de los casinos la ignoran; incluirla amplía público y demuestra calidad de ingeniería.
5. **Personalización del lobby** basada en comportamiento (juegos que jugás → recomendaciones), con un motor simple que después escala.
6. **Búsqueda y filtrado superiores** (por proveedor, volatilidad, RTP, features) — power users lo aman y es fácil con buen modelo de datos.
7. **PWA instalable** con offline shell y push notifications — experiencia casi nativa sin costo de apps nativas.
8. **Rendimiento medido y presupuestado:** budgets de performance en CI (Lighthouse/Web Vitals como gate) para que la velocidad no se degrade con el tiempo. Convertir "rápido" en garantía, no en accidente.


---

# Capítulo 14 — Desarrollo con Claude Code

Este capítulo es el que hace que el proyecto sea construible y mantenible por una IA durante años. La idea central: **estructura fuerte + módulos independientes + contratos explícitos + tests como red de seguridad.** Claude Code rinde mejor cuando el proyecto tiene fronteras claras y convenciones predecibles; el caos lo confunde tanto como a un humano, pero más.

## 14.1 Principios para que la IA mantenga el proyecto

1. **Módulos independientes y verticales.** Cada módulo (wallet, auth, games…) es una "rebanada vertical" completa: sus rutas, su lógica, sus tests, su documentación. Se puede desarrollar y testear **entero** antes de pasar al siguiente, como pediste.
2. **Contratos antes que implementación.** Cada módulo publica una interfaz (puerto). Los demás dependen de la interfaz, no de la implementación. Esto permite trabajar un módulo sin romper otros y es la base de las costuras a dinero real.
3. **Convenciones estrictas y documentadas.** Un `CLAUDE.md` en la raíz y en cada módulo que le dice a la IA las reglas del lugar. La consistencia es más valiosa que la brillantez puntual.
4. **Tests como especificación ejecutable.** El comportamiento correcto del wallet vive en tests. La IA puede refactorizar con confianza porque los tests atrapan regresiones. Para el wallet, cobertura casi total y tests de concurrencia obligatorios.
5. **Cambios pequeños y revisables.** Un PR = un cambio acotado. Fácil de revisar, fácil de revertir.

## 14.2 Estructura del repositorio

```
casino/
├── CLAUDE.md                 # reglas globales para Claude Code (ver 14.4)
├── README.md                 # cómo levantar todo
├── docs/
│   ├── architecture.md       # este documento, resumido y vivo
│   ├── adr/                  # Architecture Decision Records (por qué de cada decisión)
│   └── modules/             # doc por módulo
├── apps/
│   ├── web/                  # Next.js jugador
│   │   └── CLAUDE.md         # convenciones del frontend
│   ├── admin/                # Next.js admin
│   └── api/                  # NestJS
│       ├── src/
│       │   ├── modules/
│       │   │   ├── auth/     # controller, service, dto, tests, README
│       │   │   ├── wallet/   # el más testeado; puerto + ledger + tx
│       │   │   ├── games/
│       │   │   ├── provider/ # adapters de proveedor (sim / futuros reales)
│       │   │   ├── bonus/
│       │   │   ├── payments/ # 🧩 adapter fake, puerto listo para PSP
│       │   │   ├── kyc/      # 🧩 stub
│       │   │   ├── realtime/ # WS gateway
│       │   │   └── admin/
│       │   ├── shared/       # utilidades, guards, interceptors
│       │   └── main.ts
│       └── CLAUDE.md
├── packages/
│   ├── contracts/            # tipos + Zod compartidos (fuente de verdad de las APIs)
│   ├── ui/                   # componentes compartidos
│   ├── config/               # eslint/tsconfig/prettier
│   └── provider-sim/         # proveedor simulado + modo caos
├── infra/
│   ├── docker/               # Dockerfiles, compose
│   ├── k8s/                  # manifiestos (cuando aplique)
│   └── ci/                   # workflows
└── prisma/
    ├── schema.prisma
    ├── migrations/
    └── seed.ts               # datos de demo (juegos sim, categorías, usuario demo)
```

## 14.3 Cada módulo, por dentro (patrón repetible)

```
modules/wallet/
├── wallet.module.ts          # wiring NestJS
├── wallet.controller.ts      # endpoints HTTP (si expone)
├── wallet.service.ts         # lógica (usa el puerto del ledger)
├── ports/                    # interfaces que este módulo consume/expone
├── dto/                      # DTOs validados con Zod (desde contracts)
├── entities/                 # tipos de dominio
├── wallet.service.spec.ts    # unit tests (incluye concurrencia/idempotencia)
├── wallet.integration.spec.ts# con DB real efímera
└── README.md                 # qué hace, su contrato, invariantes, trampas
```

La IA, al abrir un módulo, encuentra siempre la misma forma. Predecibilidad = productividad.

## 14.4 El archivo CLAUDE.md (instrucciones para la IA)

En la raíz, un documento que Claude Code lee como reglas del proyecto. Contenido esencial:
- **Stack y versiones** exactas.
- **Reglas inviolables:** dinero en bigint (nunca float); nadie escribe saldo salvo el wallet service; ledger append-only; toda operación de saldo idempotente y atómica; secretos solo desde el secret manager; nunca tocar tablas de otro módulo.
- **Convenciones de código:** naming, estructura de módulo, cómo se escribe un endpoint, cómo se valida (Zod), cómo se maneja error.
- **Cómo correr:** tests, lint, migraciones, levantar el stack.
- **Definición de "hecho":** un módulo está terminado cuando tiene tests (con casos de concurrencia si toca saldo), README, y pasa lint/typecheck/CI.
- **Las trampas del Cap. 12** listadas como checklist a evitar.

## 14.5 Cómo escribir prompts para Claude Code

- **Un módulo por sesión, con su contrato claro.** "Implementá el módulo wallet según `docs/modules/wallet.md` y el puerto en `ports/`. Incluí tests de idempotencia y de bets concurrentes. Respetá las reglas de CLAUDE.md."
- **Dar el contrato, no el código.** Describí qué debe cumplir (invariantes, casos), dejá que la IA implemente, y verificá con tests.
- **Pedir tests primero (TDD) para el núcleo crítico** (wallet, ledger, idempotencia): "Escribí primero los tests que demuestran que un doble bet no descuenta dos veces; después la implementación que los hace pasar."
- **Iterar en pequeño:** una responsabilidad por prompt. No "hacé todo el casino".
- **Pedir ADRs:** cuando la IA tome una decisión de arquitectura, que la documente en `docs/adr/`.

## 14.6 Revisiones, refactors, tests, documentación

- **Revisiones:** cada PR pasa CI (lint, types, tests, resiliencia). Para módulos de dinero, revisión humana obligatoria además de la IA.
- **Refactors:** seguros gracias a los tests. Estrategia: los tests describen el comportamiento; el refactor no debe cambiarlos; si un refactor requiere cambiar tests de wallet, es una señal de alarma.
- **Tests automatizados:** unit (lógica), integración (con DB/Redis efímeros), resiliencia (provider-sim modo caos: duplicados, timeouts, fuera de orden), e2e (Playwright) para flujos críticos de UI.
- **Documentación:** README por módulo + ADRs + este documento como `docs/architecture.md` vivo. La IA actualiza la doc como parte de "hecho".

---

# Capítulo 15 — Roadmap semana a semana

Roadmap orientativo asumiendo dedicación seria con Claude Code. Cada módulo se completa (con tests) antes del siguiente, como pediste. Ajustá el ritmo a tu disponibilidad real.

**Semana 0 — Fundaciones.**
Monorepo (pnpm + Turborepo), configs compartidas, Docker Compose (postgres, redis, api, web), CI básico (lint+types+test), `CLAUDE.md`, esquema Prisma inicial y migraciones, seed mínimo. *Entregable:* el stack levanta con un `docker compose up` y CI verde.

**Semana 1 — Auth + usuarios.**
Registro, login, JWT + refresh con rotación, sesiones, guards RBAC, 2FA base. Tests. *Entregable:* podés registrarte, loguearte, y hay sesiones revocables.

**Semana 2 — Wallet + Ledger (el núcleo, el más importante).**
Ledger de doble entrada, wallet service, idempotencia, bloqueos, constraint de saldo, tipos de saldo (cash/bonus). Tests de concurrencia e idempotencia exhaustivos (TDD). *Entregable:* el wallet es correcto bajo carga concurrente, demostrado por tests. **No avances sin esto sólido.**

**Semana 3 — Provider-sim + protocolo de callbacks.**
El proveedor simulado con RNG (provably fair), endpoint de callback con HMAC, launch de juego, rondas, reconciliación básica, y el "modo caos". Tests de resiliencia. *Entregable:* un juego simple (dice) apuesta de verdad contra el wallet, y sobrevive al modo caos.

**Semana 4 — Catálogo de juegos + más originals.**
Modelo de catálogo, categorías, proveedores, endpoints de juegos, favoritos, recientes. Más juegos sim (coinflip, mines, mini-slot, crash/aviator). *Entregable:* catálogo navegable con varios juegos jugables.

**Semana 5 — Frontend jugador (parte 1).**
Design system (tokens, tema oscuro), layout mobile-first, lobby, buscador, ficha/launch en iframe, saldo en header. *Entregable:* UI donde navegás el catálogo y jugás.

**Semana 6 — Real-time.**
WS Gateway, saldo en vivo, notificaciones, Redis adapter para multi-instancia, reconexión + resync. Crash game en tiempo real. *Entregable:* el saldo se actualiza solo; Aviator funciona en vivo.

**Semana 7 — Bonos, free spins, VIP, cashback.**
Campañas, otorgamiento, wagering con contribución por juego, free spins, niveles VIP, cashback (job). UI de bonos con progreso transparente. *Entregable:* flujo completo de bono con rollover demostrable.

**Semana 8 — Pagos (fake) + historizados.**
Depósito/retiro fake (puertos listos para PSP), historial de transacciones y de apuestas, centro de notificaciones. *Entregable:* ciclo económico completo (depositás FUN, jugás, "retirás").

**Semana 9 — Panel admin + backoffice.**
App admin, auth separada, dashboard/KPIs, gestión de usuarios con ledger, ajustes auditados, cola de retiros, gestión de catálogo/bonos, audit logs, motor de reglas antifraude básico. *Entregable:* operás la plataforma desde el admin.

**Semana 10 — Seguridad + hardening.**
Rate limiting, WAF/Cloudflare, CSP, revisión OWASP, secret manager, rotación de claves, pen-test propio, redacción de logs. *Entregable:* checklist de seguridad del Cap. 8 completo.

**Semana 11 — Observabilidad + despliegue.**
Prometheus/Grafana, Sentry, OpenTelemetry, dashboards y alertas, pipeline CI/CD completo con staging, backups probados, health checks. Deploy a un entorno real (VPS/PaaS). *Entregable:* plataforma desplegada y monitoreada.

**Semana 12 — Pulido, performance y demo.**
Web Vitals/Lighthouse como gate, animaciones, PWA, accesibilidad, e2e (Playwright), datos de demo atractivos, documentación final. *Entregable:* plataforma de portfolio pulida y presentable.

**A partir de ahí (opcional):** endurecer, más juegos, personalización del lobby, y —🧩 si aparece la licencia— implementar los cinco adapters reales (PSP, KYC, proveedor real, juego responsable, reporting) y pasar certificación. El núcleo no se toca.

---

# Cierre

Este documento describe una plataforma **play money** que es arquitectónicamente idéntica a una real en todo lo que importa de ingeniería: wallet con idempotencia y atomicidad, ledger de doble entrada, motor de rondas, integración de proveedores por callbacks (simulados hoy), real-time, seguridad, y despliegue. Las cinco diferencias con una plataforma de dinero real (PSP, KYC, proveedores certificados, juego responsable, reporting) están aisladas detrás de **puertos** con adapters *fake* hoy, de modo que —respondiendo a tu pregunta— el día que exista licencia, "darla de alta" significa implementar esos cinco adapters y pasar certificación, **sin reescribir el núcleo**. Eso es semanas de trabajo enchufado sobre una base sólida, no un rediseño.

Esperando tu próxima instrucción antes de escribir una sola línea de código de la plataforma, tal como pediste.
