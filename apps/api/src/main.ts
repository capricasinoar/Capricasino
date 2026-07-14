import "reflect-metadata";
import { RequestMethod } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { IoAdapter } from "@nestjs/platform-socket.io";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "./app.module";

export async function createApp(): Promise<NestFastifyApplication> {
  // NestJS sobre Fastify: estructura de Nest + performance de Fastify (ADR 0001)
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: process.env.NODE_ENV === "test" ? false : ["log", "warn", "error"],
  });
  await app.register(fastifyCookie);
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
