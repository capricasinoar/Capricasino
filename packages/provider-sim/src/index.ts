// provider-sim — proveedor de juegos SIMULADO que habla el protocolo real
// (Cap. 3.9): launch por HTTP, juego corriendo server-side, y callbacks
// bet/win firmados contra el wallet del operador. El wallet no distingue
// este proveedor de uno real: esa es la gracia.
import Fastify from "fastify";
import { getSession, playDice, rotateSeed, setClientSeed } from "./dice";
import { callOperator } from "./operator-client";
import { dicePage } from "./dice-page";

// PORT lo inyecta el host (Railway); SIM_PORT es el fallback local.
const PORT = Number(process.env.PORT ?? process.env.SIM_PORT ?? 4100);
const PUBLIC_URL = process.env.SIM_PUBLIC_URL ?? `http://localhost:${PORT}`;

const app = Fastify({ logger: false });

// ── Launch (Dirección A del protocolo: el operador nos llama) ────────
app.post<{ Body: { game_id?: string; player_token?: string } }>("/launch", async (req, reply) => {
  const { game_id, player_token } = req.body ?? {};
  if (game_id !== "dice" || !player_token) {
    return reply.status(400).send({ error: "UNSUPPORTED_GAME" });
  }
  return { game_url: `${PUBLIC_URL}/play/dice?token=${encodeURIComponent(player_token)}` };
});

// ── El juego (lo abre el browser del jugador en un iframe) ───────────
app.get<{ Querystring: { token?: string } }>("/play/dice", async (req, reply) => {
  const token = req.query.token;
  if (!token) return reply.status(400).send("token requerido");
  reply.header("content-type", "text/html; charset=utf-8");
  return dicePage(token);
});

// Estado de la sesión de juego: saldo (vía callback balance) + provably fair
app.get<{ Querystring: { token?: string } }>("/api/dice/state", async (req) => {
  const token = req.query.token ?? "";
  const op = await callOperator({ action: "balance", token, timestamp: Date.now() });
  if (op.status !== "OK") return { error: `Sesión inválida (${op.status})` };
  const s = getSession(token);
  return { balance: op.balance, serverSeedHash: s.serverSeedHash, clientSeed: s.clientSeed, nonce: s.nonce };
});

// ── La tirada: TODO el dinero se mueve server-to-server ──────────────
app.post<{ Body: { token?: string; amount?: number; target?: number; clientSeed?: string } }>(
  "/api/dice/roll",
  async (req) => {
    const { token, amount, target, clientSeed } = req.body ?? {};
    if (!token || !Number.isInteger(amount) || amount! <= 0) return { error: "Apuesta inválida" };
    if (!Number.isInteger(target) || target! < 2 || target! > 98) return { error: "Objetivo inválido (2-98)" };
    if (amount! > 1_000_000_00) return { error: "Apuesta máxima: 1.000.000 USD" };
    if (clientSeed) setClientSeed(token, clientSeed);

    // 1. El RNG resuelve la tirada ANTES de mover dinero (la semilla ya estaba comprometida)
    const s = getSession(token);
    const result = playDice(s, amount!, target!);

    // 2. DEBIT (bet) contra el wallet del operador
    const bet = await callOperator({
      action: "bet",
      token,
      amount: amount!,
      roundId: result.roundId,
      transactionId: result.betTxId,
      gameCode: "dice",
      timestamp: Date.now(),
    });
    if (bet.status === "INSUFFICIENT_FUNDS") return { error: "Saldo insuficiente", balance: bet.balance };
    if (bet.status === "LIMIT_REACHED") return { error: "Has alcanzado tu límite de juego responsable por hoy", balance: bet.balance };
    if (bet.status !== "OK") return { error: `El operador rechazó la apuesta (${bet.status})` };

    // 3. CREDIT (win) solo si ganó — perder es un bet sin win (Cap. 3.5)
    let balance = bet.balance ?? 0;
    if (result.win && result.winTxId) {
      const win = await callOperator({
        action: "win",
        token,
        amount: result.payout,
        roundId: result.roundId,
        transactionId: result.winTxId,
        timestamp: Date.now(),
      });
      if (win.status === "OK") {
        balance = win.balance ?? balance;
      } else {
        // El premio no pudo acreditarse (red): el job de reconciliación de
        // rondas abiertas lo resolvería (Cap. 3.7). Registramos y seguimos.
        console.error(`[provider-sim] win no acreditado: ${win.status} round=${result.roundId}`);
      }
    }

    return {
      rollValue: result.rollValue,
      win: result.win,
      payout: result.payout,
      multiplier: result.multiplier,
      balance,
      nonce: result.nonce,
      serverSeedHash: result.serverSeedHash,
      clientSeed: result.clientSeed,
      roundId: result.roundId,
    };
  },
);

// Rotar semilla y revelar la anterior (verificación provably fair)
app.post<{ Body: { token?: string } }>("/api/dice/rotate-seed", async (req) => {
  const token = req.body?.token;
  if (!token) return { error: "token requerido" };
  return rotateSeed(token);
});

app.get("/health", async () => ({ status: "ok", service: "capri-provider-sim" }));

app.listen({ port: PORT, host: "0.0.0.0" }).then(() => {
  console.log(`provider-sim → http://localhost:${PORT}  (callbacks → ${process.env.OPERATOR_CALLBACK_URL ?? "http://localhost:4000/provider/v1/callback"})`);
});
