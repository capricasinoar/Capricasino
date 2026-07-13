import { Controller, Get } from "@nestjs/common";

@Controller()
export class HealthController {
  // Liveness: el proceso responde.
  @Get("health")
  health() {
    return { status: "ok", service: "capri-api", ts: new Date().toISOString() };
  }

  // Readiness: cuando existan, aquí se comprueban Postgres y Redis (Cap. 13.7).
  @Get("ready")
  ready() {
    return { status: "ok", checks: { postgres: "pending(S2)", redis: "pending(S2)" } };
  }
}
