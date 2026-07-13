import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import fastifyCookie from "@fastify/cookie";
import { AppModule } from "./app.module";

export async function createApp(): Promise<NestFastifyApplication> {
  // NestJS sobre Fastify: estructura de Nest + performance de Fastify (ADR 0001)
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: process.env.NODE_ENV === "test" ? false : ["log", "warn", "error"],
  });
  await app.register(fastifyCookie);
  app.setGlobalPrefix("api/v1");
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
