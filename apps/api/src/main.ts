import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { IoAdapter } from "@nestjs/platform-socket.io";
import fastifyCookie from "@fastify/cookie";
import fastifyHelmet from "@fastify/helmet";
import { AppModule } from "./app.module";

// En producción, los secretos DEBEN venir del secret manager (Cap. 8.7).
// Arrancar con los valores de desarrollo sería una brecha: se aborta.
function assertProductionSecrets() {
  if (process.env.NODE_ENV !== "production") return;
  const devSecrets: [string, string][] = [
    ["JWT_SECRET", "capri-dev-secret-cambiar-en-produccion"],
    ["ADMIN_JWT_SECRET", "capri-admin-secret-cambiar-en-produccion"],
    ["PROVIDER_SIM_SECRET", "capri-sim-secret-dev"],
    ["ADMIN_TOTP_KEY", "capri-dev-totp-key-cambiar"],
  ];
  const insecure = devSecrets.filter(([k, dev]) => !process.env[k] || process.env[k] === dev).map(([k]) => k);
  if (insecure.length) {
    throw new Error(`Arranque abortado: secretos inseguros en producción → ${insecure.join(", ")}. Configúralos en el secret manager.`);
  }
}

export async function createApp(): Promise<NestFastifyApplication> {
  assertProductionSecrets();
  // NestJS sobre Fastify: estructura de Nest + performance de Fastify (ADR 0001)
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ trustProxy: true }), {
    logger: process.env.NODE_ENV === "test" ? false : ["log", "warn", "error"],
  });
  await app.register(fastifyCookie);
  // Cabeceras de seguridad (Cap. 8.4): CSP, anti-clickjacking, HSTS, nosniff.
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        // los juegos se sirven en iframe desde el proveedor (hoy provider-sim)
        frameSrc: ["'self'", process.env.PROVIDER_SIM_URL ?? "http://localhost:4100"],
        connectSrc: ["'self'", ...(process.env.WEB_ORIGIN ? [process.env.WEB_ORIGIN] : [])],
      },
    },
    // Esta API no se embebe en iframes de nadie.
    frameguard: { action: "deny" },
  });
  // Socket.IO para el saldo en tiempo real (Cap. 9), sobre el mismo servidor HTTP.
  app.useWebSocketAdapter(new IoAdapter(app));
  // Fuera de /api/v1: el callback del proveedor (server-to-server, Cap. 7.5) y
  // TODO el panel admin (app + auth separadas, Cap. 10) que cuelga de /admin/v1.
  app.setGlobalPrefix("api/v1", {
    exclude: [
      { path: "provider/v1/callback", method: RequestMethod.ALL },
      { path: "admin/v1/(.*)", method: RequestMethod.ALL },
    ],
  });
  app.enableCors({
    // web jugador (3000) + panel admin (3001)
    origin: [process.env.WEB_ORIGIN ?? "http://localhost:3000", process.env.ADMIN_ORIGIN ?? "http://localhost:3001"],
    credentials: true, // la cookie de refresh viaja entre web y api
  });
  app.enableShutdownHooks(); // graceful shutdown (Cap. 13.7)
  return app;
}

async function bootstrap() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`CAPRI CASINO api → http://localhost:${port}/api/v1/health`);
}

// Los tests importan createApp sin arrancar el servidor.
if (require.main === module) {
  bootstrap();
}
