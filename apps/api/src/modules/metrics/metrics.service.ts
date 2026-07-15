// Métricas Prometheus (Cap. 13.6). Métricas de sistema (Node) + de negocio
// (bets, GGR, operaciones de wallet, latencia HTTP). Se exponen en /metrics.
import { Injectable } from "@nestjs/common";
import { Counter, Histogram, Registry, collectDefaultMetrics } from "prom-client";

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly httpRequests = new Counter({
    name: "capri_http_requests_total",
    help: "Peticiones HTTP por método, ruta y código",
    labelNames: ["method", "route", "status"] as const,
    registers: [this.registry],
  });

  readonly httpDuration = new Histogram({
    name: "capri_http_request_duration_seconds",
    help: "Latencia HTTP en segundos",
    labelNames: ["method", "route"] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
    registers: [this.registry],
  });

  readonly walletOps = new Counter({
    name: "capri_wallet_operations_total",
    help: "Operaciones de wallet por tipo",
    labelNames: ["type"] as const, // bet | win | deposit | withdrawal | rollback
    registers: [this.registry],
  });

  readonly walletAmount = new Counter({
    name: "capri_wallet_amount_total",
    help: "Monto acumulado por tipo (unidad mínima USD)",
    labelNames: ["type"] as const,
    registers: [this.registry],
  });

  constructor() {
    // CPU, memoria, event loop, GC, handles… (prefijadas capri_)
    collectDefaultMetrics({ register: this.registry, prefix: "capri_" });
  }

  recordWalletOp(type: string, amountMinorUnits: bigint) {
    this.walletOps.inc({ type });
    this.walletAmount.inc({ type }, Number(amountMinorUnits));
  }

  render(): Promise<string> {
    return this.registry.metrics();
  }
}
