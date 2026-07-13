import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import { AppModule } from "./app.module";

async function bootstrap() {
  // NestJS sobre Fastify: estructura de Nest + performance de Fastify (ADR 0001)
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.setGlobalPrefix("api/v1");
  app.enableShutdownHooks(); // graceful shutdown (Cap. 13.7)

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
  console.log(`CAPRI CASINO api → http://localhost:${port}/api/v1/health`);
}

bootstrap();
