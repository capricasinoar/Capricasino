// Cliente que golpea el callback del OPERADOR (bet/win/rollback/balance),
// firmando con HMAC — la misma cadena canónica que verifica el operador.
// Incluye reintentos con backoff (la red no es confiable — Cap. 3.6) y un
// "modo caos" que duplica callbacks a propósito para probar la idempotencia.
import { createHmac } from "node:crypto";

const OPERATOR_URL = () => process.env.OPERATOR_CALLBACK_URL ?? "http://localhost:4000/provider/v1/callback";
const SECRET = () => process.env.PROVIDER_SIM_SECRET ?? "capri-sim-secret-dev";
const CHAOS_DUP = () => Number(process.env.CHAOS_DUPLICATE_PROB ?? 0); // 0..1

export interface CallbackPayload {
  action: "balance" | "bet" | "win" | "rollback";
  token: string;
  amount?: number;
  roundId?: string;
  transactionId?: string;
  referenceTransactionId?: string;
  gameCode?: string;
  timestamp: number;
}

export interface OperatorResponse {
  status: "OK" | "INSUFFICIENT_FUNDS" | "INVALID_TOKEN" | "TRANSACTION_NOT_FOUND" | "INTERNAL_ERROR";
  balance?: number;
  transactionId?: string;
}

function sign(p: CallbackPayload): string {
  const canonical = [
    p.action,
    p.token,
    p.amount ?? "",
    p.roundId ?? "",
    p.transactionId ?? "",
    p.referenceTransactionId ?? "",
    p.timestamp,
  ].join("|");
  return createHmac("sha256", SECRET()).update(canonical).digest("hex");
}

async function post(payload: CallbackPayload & { hash: string }): Promise<OperatorResponse> {
  const res = await fetch(OPERATOR_URL(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(8_000),
  });
  if (res.status === 401) throw new Error("Operador rechazó la firma (secret desincronizado)");
  if (!res.ok) throw new Error(`Operador HTTP ${res.status}`);
  return (await res.json()) as OperatorResponse;
}

/**
 * Envía un callback con reintentos (mismo transactionId ⇒ el operador debe
 * responder idéntico gracias a su idempotencia). Con CHAOS_DUPLICATE_PROB > 0
 * duplica el envío a propósito.
 */
export async function callOperator(payload: CallbackPayload): Promise<OperatorResponse> {
  const signed = { ...payload, hash: sign(payload) };

  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await post(signed);
      // Modo caos: reenvía el MISMO callback (como haría un proveedor que no
      // recibió el OK). El resultado autoritativo sigue siendo el primero.
      if (CHAOS_DUP() > 0 && Math.random() < CHAOS_DUP()) {
        post(signed).catch(() => undefined);
      }
      return result;
    } catch (e) {
      lastError = e;
      await new Promise((r) => setTimeout(r, 150 * attempt));
    }
  }
  throw lastError;
}
