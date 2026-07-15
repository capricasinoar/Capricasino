import { Module } from "@nestjs/common";
import { VipController } from "./vip.controller";
import { VipService } from "./vip.service";

// Exporta VipService para que el admin muestre el nivel de cada cliente.
@Module({
  controllers: [VipController],
  providers: [VipService],
  exports: [VipService],
})
export class VipModule {}
