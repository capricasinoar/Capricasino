// Firma HMAC de callbacks del proveedor (Cap. 3.4).
// El proveedor y el operador implementan ESTA MISMA cadena canónica.
// Cambiarla rompe la integración: tratar como parte del contrato.
import { createHmac, timingSafeEqual } from "node:crypto";

export interface SignableCallback {
  action: string;
  token: string;
  amount?: number;
  roundId?: string;
  transactionId?: string;
  referenceTransactionId?: string;
  timestamp: number;
}

export function canonicalString(p: SignableCallback): string {
  return [
    p.action,
    p.token,
    p.amount ?? "",
    p.roundId ?? "",
    p.transactionId ?? "",
    p.referenceTransactionId ?? "",
    p.timestamp,
  ].join("|");
}

export function signCallback(p: SignableCallback, secret: string): string {
  return createHmac("sha256", secret).update(canonicalString(p)).digest("hex");
}

// TRAMPA #5: comparación en tiempo constante, SIEMPRE antes de tocar lógica.
export function verifySignature(p: SignableCallback, hash: string, secret: string): boolean {
  const expected = signCallback(p, secret);
  const a = Buffer.from(expected, "hex");
  let b: Buffer;
  try {
    b = Buffer.from(hash, "hex");
  } catch {
    return false;
  }
  return a.length === b.length && timingSafeEqual(a, b);
}
