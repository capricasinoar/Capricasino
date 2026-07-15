"use client";

// Pantalla de acceso (web privada): la primera página al abrir la web. No hay
// registro — solo el operador da de alta clientes desde el panel admin.
import { useState } from "react";
import { session } from "@/lib/session-store";
import { ApiError } from "@/lib/api";
import { Logo } from "./logo";

export function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      await session.login(email, password);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden px-4">
      {/* halos de marca */}
      <div className="orb left-[-10%] top-[-15%] h-[26rem] w-[26rem] bg-azure-deep/40" />
      <div className="orb right-[-12%] bottom-[-10%] h-[30rem] w-[30rem] bg-gold-dim/25" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Logo />
          <p className="mt-5 font-display text-2xl font-semibold">Bienvenido de nuevo</p>
          <p className="mt-1 text-sm text-ink-soft">Acceso exclusivo para clientes de CAPRI.</p>
        </div>

        <form onSubmit={submit} className="glass rounded-2xl p-6">
          <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-ink-mute">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="tu@email.com"
            className="mb-4 w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm text-ink placeholder:text-ink-mute focus:border-gold/60 focus:outline-none"
          />
          <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-ink-mute">Contraseña</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm text-ink placeholder:text-ink-mute focus:border-gold/60 focus:outline-none"
          />

          {error && <p className="mt-3 text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-5 w-full cursor-pointer rounded-full bg-gold py-3 text-sm font-bold text-night transition-colors duration-200 hover:bg-gold-bright disabled:opacity-50"
          >
            {busy ? "Entrando…" : "Iniciar sesión"}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-ink-mute">
          ¿No tienes cuenta? Solo tu operador puede darte de alta. Ponte en contacto con él.
        </p>
      </div>
    </div>
  );
}
