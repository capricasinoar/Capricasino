// Gateway de tiempo real (Cap. 9.2-9.3). Autentica el socket con el JWT del
// jugador en el handshake y lo mete en su sala `user:{id}`. Cuando el wallet
// emite `balance.changed`, empuja el saldo a esa sala.
//
// TRAMPA #11: el WS solo NOTIFICA. Si se cae, el saldo sigue correcto en la DB;
// el cliente resincroniza por REST al reconectar.
import { Logger } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { OnEvent } from "@nestjs/event-emitter";
import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from "@nestjs/websockets";
import type { Server, Socket } from "socket.io";
import { WalletService, BALANCE_CHANGED, type BalanceChangedEvent } from "../wallet/wallet.service";
import { NotificationsService, NOTIFICATION_CREATED, type NotificationCreatedEvent } from "../notifications/notifications.service";

@WebSocketGateway({
  cors: { origin: [process.env.WEB_ORIGIN ?? "http://localhost:3000"], credentials: true },
})
export class RealtimeGateway implements OnGatewayConnection {
  private readonly log = new Logger("RealtimeGateway");

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly wallet: WalletService,
    private readonly notifications: NotificationsService,
  ) {}

  async handleConnection(client: Socket) {
    // El token viaja en el handshake (auth.token). Un socket sin token válido
    // se desconecta: no confiamos en nadie sin autenticar.
    const token = (client.handshake.auth?.token as string | undefined) ?? "";
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string }>(token);
      client.data.userId = payload.sub;
      await client.join(`user:${payload.sub}`);
      // Empujar el saldo actual nada más conectar (estado inicial sin esperar REST).
      const b = await this.wallet.getBalance(payload.sub);
      client.emit("balance", { cash: Number(b.cash), bonus: Number(b.bonus), total: Number(b.total) });
    } catch {
      client.disconnect(true);
    }
  }

  @OnEvent(BALANCE_CHANGED)
  async onBalanceChanged(event: BalanceChangedEvent) {
    // Leemos el saldo completo (cash+bonus) y lo empujamos a la sala del usuario.
    const b = await this.wallet.getBalance(event.userId);
    this.server.to(`user:${event.userId}`).emit("balance", {
      cash: Number(b.cash),
      bonus: Number(b.bonus),
      total: Number(b.total),
    });
  }

  @OnEvent(NOTIFICATION_CREATED)
  async onNotification(event: NotificationCreatedEvent) {
    // Empuja el contador de no leídas; el cliente refresca el listado al abrir.
    const unread = await this.notifications.unreadCount(event.userId);
    this.server.to(`user:${event.userId}`).emit("notification", { unread });
  }
}
