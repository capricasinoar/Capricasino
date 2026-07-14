// Tests del TOTP y del cifrado del secreto (no requieren DB).
import { describe, expect, it } from "vitest";
import { generateBase32Secret, verifyTotp, otpauthUri, encryptSecret, decryptSecret } from "./totp";
import { createHmac } from "node:crypto";

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function decode(secret: string): Buffer {
  let bits = "";
  for (const ch of secret) bits += BASE32.indexOf(ch).toString(2).padStart(5, "0");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}
function codeNow(secret: string, offset = 0): string {
  const counter = Math.floor(Date.now() / 1000 / 30) + offset;
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(0, 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const h = createHmac("sha1", decode(secret)).update(buf).digest();
  const o = h[h.length - 1] & 0xf;
  const c = ((h[o] & 0x7f) << 24) | ((h[o + 1] & 0xff) << 16) | ((h[o + 2] & 0xff) << 8) | (h[o + 3] & 0xff);
  return (c % 1_000_000).toString().padStart(6, "0");
}

describe("TOTP (2FA)", () => {
  it("genera un secreto base32 válido", () => {
    const s = generateBase32Secret();
    expect(s).toMatch(/^[A-Z2-7]+$/);
    expect(s.length).toBeGreaterThanOrEqual(30);
  });

  it("verifica el código correcto del momento actual", () => {
    const s = generateBase32Secret();
    expect(verifyTotp(s, codeNow(s))).toBe(true);
  });

  it("acepta ±1 paso (tolerancia de reloj) pero rechaza fuera de ventana", () => {
    const s = generateBase32Secret();
    expect(verifyTotp(s, codeNow(s, -1))).toBe(true);
    expect(verifyTotp(s, codeNow(s, 1))).toBe(true);
    expect(verifyTotp(s, codeNow(s, 5))).toBe(false);
  });

  it("rechaza un código mal formado o incorrecto", () => {
    const s = generateBase32Secret();
    expect(verifyTotp(s, "000000")).toBe(false);
    expect(verifyTotp(s, "abc")).toBe(false);
  });

  it("otpauthUri contiene el secreto y el emisor", () => {
    const uri = otpauthUri("ABC234", "owner@capri.local");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("secret=ABC234");
    expect(uri).toContain("issuer=CAPRI");
  });

  it("cifra y descifra el secreto (round-trip AES-GCM)", () => {
    const secret = generateBase32Secret();
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret); // no está en claro
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("un texto cifrado alterado falla (autenticidad GCM)", () => {
    const enc = encryptSecret("HELLO234");
    const tampered = enc.slice(0, -4) + "AAAA";
    expect(() => decryptSecret(tampered)).toThrow();
  });
});
