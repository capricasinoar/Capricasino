// Motor del juego simulado (Capri Dice) EMBEBIDO en la API. Sirve la página del
// juego y su API bajo /sim, y mueve saldo llamando al ProviderService interno
// (mismo protocolo bet/win/round que un proveedor real, pero in-process).
// Así todo corre en un solo servicio — no hace falta desplegar el sim aparte.
import { Body, Controller, Get, Header, Post, Query } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { getSession, playDice, setClientSeed, dicePage } from "@capri/provider-sim";
import { ProviderService } from "../provider/provider.service";

@SkipThrottle()
@Controller("sim")
export class SimController {
  constructor(private readonly provider: ProviderService) {}

  // Página del juego (la abre el navegador en un <iframe> desde la web). Las
  // cabeceras (CSP inline + frame-ancestors, sin X-Frame-Options) las fija
  // helmet globalmente en main.ts para permitir el embebido.
  @Get("play/dice")
  @Header("content-type", "text/html; charset=utf-8")
  play(@Query("token") token: string) {
    return token ? dicePage(token, "/sim") : "token requerido";
  }

  // Estado: saldo (vía callback balance) + datos provably fair.
  @Get("api/dice/state")
  async state(@Query("token") token: string) {
    const bal = await this.provider.handle({ action: "balance", token, timestamp: Date.now(), hash: "" });
    if (bal.status !== "OK") return { error: `Sesión inválida (${bal.status})` };
    const s = getSession(token);
    return { balance: bal.balance, serverSeedHash: s.serverSeedHash, clientSeed: s.clientSeed, nonce: s.nonce };
  }

  // Tirada: el RNG resuelve, luego bet y (si gana) win contra el wallet.
  @Post("api/dice/roll")
  async roll(@Body() body: { token?: string; amount?: number; target?: number; clientSeed?: string }) {
    const { token, amount, target, clientSeed } = body ?? {};
    if (!token || !Number.isInteger(amount) || amount! <= 0) return { error: "Apuesta inválida" };
    if (!Number.isInteger(target) || target! < 2 || target! > 98) return { error: "Objetivo inválido (2-98)" };
    if (amount! > 1_000_000_00) return { error: "Apuesta máxima: 1.000.000 USD" };
    if (clientSeed) setClientSeed(token, clientSeed);

    const s = getSession(token);
    const result = playDice(s, amount!, target!);

    // DEBIT (bet)
    const bet = await this.provider.handle({
      action: "bet", token, amount: amount!, roundId: result.roundId,
      transactionId: result.betTxId, gameCode: "dice", timestamp: Date.now(), hash: "",
    });
    if (bet.status === "INSUFFICIENT_FUNDS") return { error: "Saldo insuficiente", balance: bet.balance };
    if (bet.status === "LIMIT_REACHED") return { error: "Has alcanzado tu límite de juego responsable por hoy", balance: bet.balance };
    if (bet.status !== "OK") return { error: `El operador rechazó la apuesta (${bet.status})` };

    // CREDIT (win) solo si ganó
    let balance = bet.balance ?? 0;
    if (result.win && result.winTxId) {
      const win = await this.provider.handle({
        action: "win", token, amount: result.payout, roundId: result.roundId,
        transactionId: result.winTxId, timestamp: Date.now(), hash: "",
      });
      if (win.status === "OK") balance = win.balance ?? balance;
    }

    return {
      rollValue: result.rollValue, win: result.win, payout: result.payout,
      multiplier: result.multiplier, balance, nonce: result.nonce,
      serverSeedHash: result.serverSeedHash, clientSeed: result.clientSeed, roundId: result.roundId,
    };
  }
}
