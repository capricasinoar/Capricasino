// Tests de integración del módulo auth contra Postgres real (docker compose).
// Cubren: registro, login, guard, refresh con ROTACIÓN y DETECCIÓN DE REUSO,
// logout y no-enumeración de usuarios. Si la DB no está accesible, la suite
// se marca como omitida (skip) en lugar de fallar.
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { PrismaClient } from "@prisma/client";
import { AuthService } from "./auth.service";

const prisma = new PrismaClient();
let dbUp = true;
try {
  await prisma.$queryRaw`SELECT 1`;
} catch {
  dbUp = false;
}

const run = describe.skipIf(!dbUp);

// Sufijo aleatorio: la suite es re-ejecutable sin limpiar la DB a mano.
const suffix = Math.random().toString(36).slice(2, 8);
const email = `ana_${suffix}@test.capri`;
const username = `ana_${suffix}`;
const password = "contraseña-segura-123";

function cookieOf(res: { headers: Record<string, unknown> }): string {
  const raw = res.headers["set-cookie"];
  const arr = Array.isArray(raw) ? raw : [raw as string];
  const rt = arr.find((c) => c?.startsWith("capri_rt="));
  return rt ? rt.split(";")[0] : "";
}

run("auth (integración)", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const { createApp } = await import("../../main");
    app = await createApp();
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app?.close();
    // Limpieza de los datos creados por esta suite.
    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      await prisma.session.deleteMany({ where: { userId: user.id } });
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      await prisma.wallet.deleteMany({ where: { userId: user.id } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  let accessToken = "";
  let refreshCookie = "";

  it("NO existe registro público: POST /auth/register da 404 (web privada)", async () => {
    const res = await app.inject({ method: "POST", url: "/api/v1/auth/register", payload: { email, username, password } });
    expect(res.statusCode).toBe(404);
  });

  it("el operador crea el cliente (vía AuthService) con su wallet a 0 USD", async () => {
    const authService = app.get(AuthService);
    const created = await authService.createUser({ email, username, password });
    expect(created.username).toBe(username);

    const user = await prisma.user.findUnique({ where: { email }, include: { wallet: true } });
    expect(user?.wallet?.cashBalance).toBe(0n);
    expect(user?.wallet?.currency).toBe("USD");
  });

  it("crear un cliente duplicado se rechaza sin revelar qué campo choca", async () => {
    const authService = app.get(AuthService);
    await expect(authService.createUser({ email, username: `otra_${suffix}`, password })).rejects.toMatchObject({
      response: { error: { code: "ALREADY_REGISTERED" } },
    });
  });

  it("login correcto devuelve access token y cookie de refresh", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    expect(res.statusCode).toBe(200);
    accessToken = res.json().accessToken;
    refreshCookie = cookieOf(res);
    expect(accessToken).toBeTruthy();
    expect(refreshCookie).toBeTruthy();
  });

  it("login con contraseña errónea y con email inexistente responden IGUAL (no enumeración)", async () => {
    const wrongPass = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password: "incorrecta-123" },
    });
    const noUser = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email: `fantasma_${suffix}@test.capri`, password: "incorrecta-123" },
    });
    expect(wrongPass.statusCode).toBe(401);
    expect(noUser.statusCode).toBe(401);
    expect(wrongPass.json().error.code).toBe(noUser.json().error.code);
  });

  it("el guard protege /me: sin token 401, con token devuelve el usuario", async () => {
    const sinToken = await app.inject({ method: "GET", url: "/api/v1/auth/me" });
    expect(sinToken.statusCode).toBe(401);

    const conToken = await app.inject({
      method: "GET",
      url: "/api/v1/auth/me",
      headers: { authorization: `Bearer ${accessToken}` },
    });
    expect(conToken.statusCode).toBe(200);
    expect(conToken.json().username).toBe(username);
  });

  it("refresh rota el token: emite uno nuevo y el viejo queda revocado", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: refreshCookie },
    });
    expect(res.statusCode).toBe(200);
    const newCookie = cookieOf(res);
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(refreshCookie);

    // Reusar el token viejo debe fallar…
    const reuse = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: refreshCookie },
    });
    expect(reuse.statusCode).toBe(401);
    expect(reuse.json().error.code).toBe("REFRESH_REUSE_DETECTED");

    // …y por seguridad revoca TODA la familia: el token nuevo también muere.
    const familia = await app.inject({
      method: "POST",
      url: "/api/v1/auth/refresh",
      headers: { cookie: newCookie },
    });
    expect(familia.statusCode).toBe(401);
  });

  it("logout revoca la sesión de la cookie", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/api/v1/auth/login",
      payload: { email, password },
    });
    const cookie = cookieOf(login);

    const logout = await app.inject({ method: "POST", url: "/api/v1/auth/logout", headers: { cookie } });
    expect(logout.statusCode).toBe(204);

    const after = await app.inject({ method: "POST", url: "/api/v1/auth/refresh", headers: { cookie } });
    expect(after.statusCode).toBe(401);
  });
});
