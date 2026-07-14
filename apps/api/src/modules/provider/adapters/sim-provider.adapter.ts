import { Injectable } from "@nestjs/common";
import type { GameProviderPort, LaunchParams, LaunchResult } from "../ports/game-provider.port";

// Adapter del proveedor simulado: llama al servidor provider-sim por HTTP,
// igual que se llamaría a la API de launch de un proveedor real (Cap. 3.3-A).
@Injectable()
export class SimProviderAdapter implements GameProviderPort {
  readonly code = "sim";
  private readonly baseUrl = process.env.PROVIDER_SIM_URL ?? "http://localhost:4100";

  async launch(params: LaunchParams): Promise<LaunchResult> {
    const res = await fetch(`${this.baseUrl}/launch`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        game_id: params.gameCode,
        player_token: params.playerToken,
        currency: params.currency,
        language: params.language,
      }),
      signal: AbortSignal.timeout(5_000),
    });
    if (!res.ok) throw new Error(`provider-sim launch falló: HTTP ${res.status}`);
    const body = (await res.json()) as { game_url: string };
    return { gameUrl: body.game_url };
  }
}
