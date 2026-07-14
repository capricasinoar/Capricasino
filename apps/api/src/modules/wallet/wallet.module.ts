import { Module } from "@nestjs/common";
import { WalletController } from "./wallet.controller";
import { WalletService } from "./wallet.service";

@Module({
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService], // único punto de acceso al saldo para otros módulos
})
export class WalletModule {}
