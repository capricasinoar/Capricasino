// Lógica del juego Dice con RNG "provably fair" (Cap. 3.9, Cap. 9.4):
//   1. El servidor genera serverSeed y PUBLICA su hash SHA-256 ANTES de apostar.
//   2. El resultado = HMAC(serverSeed, `${clientSeed}:${nonce}`) → 0.00–99.99.
//   3. Al rotar la semilla se REVELA la anterior: el jugador puede recalcular
//      cada tirada y comprobar que nada se alteró después de su apuesta.
// House edge 1%: multiplicador = 99 / target.
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";

export interface DiceSession {
  token: string;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

const sessions = new Map<string, DiceSession>();

export function getSession(token: string): DiceSession {
  let s = sessions.get(token);
  if (!s) {
    const serverSeed = randomBytes(32).toString("hex");
    s = {
      token,
      serverSeed,
      serverSeedHash: createHash("sha256").update(serverSeed).digest("hex"),
      clientSeed: randomBytes(8).toString("hex"),
      nonce: 0,
    };
    sessions.set(token, s);
  }
  return s;
}

export function setClientSeed(token: string, clientSeed: string) {
  const s = getSession(token);
  s.clientSeed = clientSeed.slice(0, 64);
}

/** Rota la semilla y revela la anterior (verificación). */
export function rotateSeed(token: string): { revealedSeed: string; revealedSeedHash: string; newHash: string } {
  const s = getSession(token);
  const revealed = { revealedSeed: s.serverSeed, revealedSeedHash: s.serverSeedHash };
  const serverSeed = randomBytes(32).toString("hex");
  s.serverSeed = serverSeed;
  s.serverSeedHash = createHash("sha256").update(serverSeed).digest("hex");
  s.nonce = 0;
  return { ...revealed, newHash: s.serverSeedHash };
}

/** Tirada determinista y verificable: 0..9999 (se muestra como 0.00–99.99). */
export function roll(s: DiceSession): number {
  s.nonce += 1;
  const digest = createHmac("sha256", s.serverSeed).update(`${s.clientSeed}:${s.nonce}`).digest("hex");
  // 4 bytes → uniforme en [0, 10000) por rechazo (evita sesgo del módulo)
  for (let i = 0; i + 8 <= digest.length; i += 8) {
    const n = parseInt(digest.slice(i, i + 8), 16);
    const max = Math.floor(0xffffffff / 10_000) * 10_000;
    if (n < max) return n % 10_000;
  }
  return parseInt(digest.slice(0, 8), 16) % 10_000;
}

export interface DiceResult {
  rollValue: number; // 0..9999
  win: boolean;
  payout: number; // unidad mínima; 0 si pierde
  multiplier: number; // ej 1.98
  roundId: string;
  betTxId: string;
  winTxId?: string;
  nonce: number;
  serverSeedHash: string;
  clientSeed: string;
}

/** target: 2..98 (gana si roll < target%). Montos en unidad mínima (centavos USD). */
export function playDice(s: DiceSession, amount: number, target: number): DiceResult {
  const rollValue = roll(s);
  const win = rollValue < target * 100;
  const multiplier = Math.floor((99 / target) * 100) / 100;
  const payout = win ? Math.floor((amount * 99) / target) : 0;
  return {
    rollValue,
    win,
    payout,
    multiplier,
    roundId: `dice_${randomUUID()}`,
    betTxId: `sim_bet_${randomUUID()}`,
    winTxId: win ? `sim_win_${randomUUID()}` : undefined,
    nonce: s.nonce,
    serverSeedHash: s.serverSeedHash,
    clientSeed: s.clientSeed,
  };
}
