import { Module } from "@nestjs/common";
import { ProviderModule } from "../provider/provider.module";
import { SimController } from "./sim.controller";

// Motor del juego simulado embebido. Reutiliza ProviderService (rondas, wallet,
// juego responsable) del ProviderModule. 🧩 El día de un agregador real, este
// módulo se quita y el catálogo apunta al proveedor externo (el seam sigue).
@Module({
  imports: [ProviderModule],
  controllers: [SimController],
})
export class SimModule {}
