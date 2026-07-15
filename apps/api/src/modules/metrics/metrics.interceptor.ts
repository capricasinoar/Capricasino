// Interceptor global: cuenta cada petición HTTP y mide su latencia, además de
// loguear un resumen estructurado (método, ruta, estado, ms) — sin PII ni
// secretos (Cap. 8.7). Usa el PATRÓN de ruta (no la URL con ids) para no
// disparar la cardinalidad de las métricas.
import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import type { FastifyReply, FastifyRequest } from "fastify";
import { MetricsService } from "./metrics.service";

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly log = new Logger("HTTP");

  constructor(private readonly metrics: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== "http") return next.handle();

    const req = context.switchToHttp().getRequest<FastifyRequest & { routeOptions?: { url?: string } }>();
    const res = context.switchToHttp().getResponse<FastifyReply>();
    const method = req.method;
    // routeOptions.url es el patrón (p.ej. /admin/v1/users/:id), no la URL real.
    const route = req.routeOptions?.url ?? req.url.split("?")[0];
    const endTimer = this.metrics.httpDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => this.record(method, route, res.statusCode, endTimer),
        error: (err) => {
          const status = (err?.status as number) ?? 500;
          this.record(method, route, status, endTimer);
        },
      }),
    );
  }

  private record(method: string, route: string, status: number, endTimer: () => number) {
    const seconds = endTimer();
    this.metrics.httpRequests.inc({ method, route, status: String(status) });
    if (status >= 500) {
      this.log.error(`${method} ${route} ${status} ${(seconds * 1000).toFixed(0)}ms`);
    }
  }
}
