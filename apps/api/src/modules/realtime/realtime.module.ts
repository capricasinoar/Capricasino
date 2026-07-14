import { Module } from "@nestjs/common";
import { WalletModule } from "../wallet/wallet.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { RealtimeGateway } from "./realtime.gateway";

// El JwtService global (registrado en AuthModule) verifica el token del socket.
// 🧩 Al escalar a >1 instancia: adaptador de Redis para Socket.IO (Cap. 9.2).
@Module({
  imports: [WalletModule, NotificationsModule],
  providers: [RealtimeGateway],
})
export class RealtimeModule {}
