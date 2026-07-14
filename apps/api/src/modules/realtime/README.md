# Módulo realtime (Semana 6) — saldo en tiempo real

WebSocket (Socket.IO) que empuja el saldo al navegador tras cada apuesta/premio, sin recargar (docs/architecture.md Cap. 9).

## Flujo

1. El jugador conecta el socket con su JWT en el handshake (`auth.token`).
2. El gateway lo verifica y lo mete en la sala `user:{id}`. Empuja el saldo inicial.
3. El `WalletService` emite `balance.changed {userId, cash}` tras cada operación commiteada (bus interno `@nestjs/event-emitter`).
4. El gateway escucha ese evento, lee el saldo completo y hace push a la sala del usuario → el navegador actualiza la cabecera.

## Principio (TRAMPA #11)

El WS solo **notifica**. Si se cae, el saldo sigue correcto en la DB. El cliente resincroniza por REST (`GET /wallet/balance`) en cada reconexión — nunca depende de haber recibido todos los mensajes.

## Seguridad

- Socket sin JWT válido → `disconnect`. Nadie sin autenticar entra en una sala.
- Cada usuario solo recibe eventos de SU sala (`user:{id}` viene del token, no del cliente).
- El evento se emite **después** del COMMIT, jamás dentro de la transacción del wallet.

## 🧩 Escalado (futuro)

Con más de una instancia del API: adaptador de Redis para Socket.IO (Cap. 9.2), para que un evento llegue al socket aunque esté conectado a otra instancia. Hoy, monolito de una instancia: bus en proceso.
