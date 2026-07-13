import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    JwtModule.register({
      global: true,
      // Solo dev: en producción la clave viene del secret manager (regla 7)
      // y será rotable con `kid` (Cap. 8.7).
      secret: process.env.JWT_SECRET ?? "capri-dev-secret-cambiar-en-produccion",
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
