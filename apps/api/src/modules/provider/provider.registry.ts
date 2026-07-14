// Registro de adapters de proveedor (🧩 COSTURA-REAL #3). El lanzamiento y el
// catálogo consultan aquí en vez de conocer proveedores concretos. Enchufar un
// agregador real = registrar su adapter (implementando GameProviderPort) aquí;
// nada más del sistema cambia.
import { Injectable } from "@nestjs/common";
import type { GameProviderPort } from "./ports/game-provider.port";
import { SimProviderAdapter } from "./adapters/sim-provider.adapter";

@Injectable()
export class ProviderRegistry {
  private readonly adapters = new Map<string, GameProviderPort>();

  constructor(sim: SimProviderAdapter) {
    this.register(sim);
    // Futuro: this.register(new RealistGamingAdapter(...)), this.register(new Hub88Adapter(...))
  }

  register(adapter: GameProviderPort) {
    this.adapters.set(adapter.code, adapter);
  }

  get(code: string): GameProviderPort | undefined {
    return this.adapters.get(code);
  }

  /** ¿Sabemos jugar juegos de este proveedor? (tiene adapter registrado) */
  has(code: string): boolean {
    return this.adapters.has(code);
  }

  codes(): string[] {
    return [...this.adapters.keys()];
  }
}
