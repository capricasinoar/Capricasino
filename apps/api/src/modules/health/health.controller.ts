import { Controller, Get, HttpCode } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { PrismaService } from "../prisma/prisma.service";

@SkipThrottle()
@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  // Liveness: el proceso responde (no toca dependencias).
  @Get("health")
  health() {
    return { status: "ok", service: "capri-api", ts: new Date().toISOString() };
  }

  // Readiness: ¿puede servir tráfico? Comprueba Postgres (Cap. 13.7).
  // 503 si la DB no responde → el balanceador no le manda tráfico.
  @Get("ready")
  @HttpCode(200)
  async ready() {
    let postgres = "ok";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch {
      postgres = "down";
    }
    const ready = postgres === "ok";
    return { status: ready ? "ok" : "degraded", checks: { postgres } };
  }
}
