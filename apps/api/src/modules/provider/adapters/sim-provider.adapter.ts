import { Injectable } from "@nestjs/common";
import type { GameProviderPort, LaunchParams, LaunchResult } from "../ports/game-provider.port";

// Adapter del proveedor simulado. El motor del juego corre EMBEBIDO en la propia
// API (módulo sim, rutas /sim), así que el "launch" solo construye la URL de la
// página del juego — no hay llamada HTTP a un servicio externo. SIM_PUBLIC_URL
// es la URL pública de la API (donde se sirve /sim/play/dice).
@Injectable()
export class SimProviderAdapter implements GameProviderPort {
  readonly code = "sim";
  private readonly baseUrl = process.env.SIM_PUBLIC_URL ?? "http://localhost:4000";

  async launch(params: LaunchParams): Promise<LaunchResult> {
    const url = `${this.baseUrl}/sim/play/${params.gameCode}?token=${encodeURIComponent(params.playerToken)}`;
    return { gameUrl: url };
  }
}
