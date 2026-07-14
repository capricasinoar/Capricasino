import { Module } from "@nestjs/common";
import { ResponsibleController } from "./responsible.controller";
import { ResponsibleService } from "./responsible.service";

// Exporta el servicio para que games (launch) y provider (bet) hagan enforcement.
@Module({
  controllers: [ResponsibleController],
  providers: [ResponsibleService],
  exports: [ResponsibleService],
})
export class ResponsibleModule {}
