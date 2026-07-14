"use client";

import { useState } from "react";
import { adminApi, setToken, AdminApiError } from "@/lib/admin-api";

export function Login({ onDone }: { onDone: (a: { email: string; role: string }) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [needsCode, setNeedsCode] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await adminApi.login(email, password, needsCode ? code : undefined);
      setToken(res.accessToken);
      onDone({ email: res.admin.email, role: res.admin.role });
    } catch (err) {
      if (err instanceof AdminApiError && (err.code === "TWO_FACTOR_REQUIRED" || err.code === "TWO_FACTOR_INVALID")) {
        setNeedsCode(true);
        setError(err.code === "TWO_FACTOR_INVALID" ? "Código incorrecto, inténtalo de nuevo." : "");
      } else {
        setError(err instanceof AdminApiError ? err.message : "No se pudo iniciar sesión");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-line bg-card p-7">
        <p className="text-center font-semibold tracking-[0.2em] text-gold-bright">CAPRI · ADMIN</p>
        <h1 className="mt-2 text-center text-lg font-semibold">Panel de administración</h1>
        <p className="mt-1 text-center text-xs text-ink-mute">Acceso solo para operadores autorizados</p>

        <div className="mt-6 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email de administrador"
            className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
          />
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
          />
          {needsCode && (
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Código de 2FA (6 dígitos)"
              className="w-full rounded-lg border border-gold/40 bg-night px-4 py-2.5 text-center text-lg tracking-[0.4em] focus:border-gold/60 focus:outline-none"
            />
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-full bg-gold py-3 text-sm font-bold text-night transition-colors hover:bg-gold-bright disabled:opacity-50"
          >
            {busy ? "Entrando…" : "Entrar"}
          </button>
        </div>
      </form>
    </div>
  );
}
