"use client";

// Conexión de tiempo real con el casino (Socket.IO). Recibe el saldo empujado
// tras cada apuesta/premio. Si se cae, socket.io reconecta solo; en cada
// (re)conexión resincronizamos por REST — el WS notifica, la DB manda (Cap. 9.3).
import { io, type Socket } from "socket.io-client";

// La base del WS es el API sin el sufijo /api/v1.
const WS_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1").replace(/\/api\/v1\/?$/, "");

let socket: Socket | null = null;

export interface RealtimeHandlers {
  onBalance: (b: { cash: number; bonus: number; total: number }) => void;
  onNotification: (n: { unread: number }) => void;
  onReconnect: () => void; // para resync por REST
}

export function connectRealtime(token: string, handlers: RealtimeHandlers) {
  disconnectRealtime();
  socket = io(WS_URL, {
    auth: { token },
    transports: ["websocket"],
    reconnection: true,
    reconnectionDelay: 500,
  });
  socket.on("balance", handlers.onBalance);
  socket.on("notification", handlers.onNotification);
  socket.io.on("reconnect", handlers.onReconnect);
  return socket;
}

export function disconnectRealtime() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}
