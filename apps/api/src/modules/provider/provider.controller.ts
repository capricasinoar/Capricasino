import { Body, Controller, HttpCode, Post, UnauthorizedException } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { ProviderCallback } from "@capri/contracts";
import { ProviderService } from "./provider.service";
import { verifySignature } from "./hmac.util";

const SIM_SECRET = () => process.env.PROVIDER_SIM_SECRET ?? "capri-sim-secret-dev";

// Endpoint server-to-server que golpea el proveedor. NO va bajo /api/v1
// (excluido del prefijo global en main.ts) y NUNCA lo llama el browser.
// Exento del rate limit del jugador: es tráfico de servidor, alto volumen
// legítimo, protegido por la firma HMAC (Cap. 8.6).
@SkipThrottle()
@Controller("provider/v1")
export class ProviderController {
  constructor(private readonly provider: ProviderService) {}

  @Post("callback")
  @HttpCode(200)
  async callback(@Body() body: unknown) {
    // 1. Forma del payload (Zod, contrato compartido)
    const parsed = ProviderCallback.safeParse(body);
    if (!parsed.success) {
      return { status: "INTERNAL_ERROR" as const };
    }
    const cb = parsed.data;

    // 2. FIRMA ANTES QUE NADA (TRAMPA #5): sin firma válida no se toca lógica.
    //    Un 401 real (no status de negocio): la petición es falsa o alterada.
    if (!verifySignature(cb, cb.hash, SIM_SECRET())) {
      throw new UnauthorizedException({ error: { code: "INVALID_SIGNATURE", message: "Firma HMAC inválida" } });
    }

    // 3. Lógica de negocio (sesión, ronda, wallet)
    return this.provider.handle(cb);
  }
}
