import { Global, Module } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

// Global: todos los módulos acceden a la DB a través de este servicio,
// pero cada módulo SOLO toca sus propias tablas (regla 8 de CLAUDE.md).
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
