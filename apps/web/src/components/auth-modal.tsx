"use client";

import { useState } from "react";
import { session } from "@/lib/session-store";
import { ApiError } from "@/lib/api";

export function AuthModal({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await session.login(email, password);
      else await session.register(email, username, password);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Algo salió mal. Inténtalo de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={mode === "login" ? "Iniciar sesión" : "Crear cuenta"}
      onClick={onClose}
    >
      <div className="glass w-full max-w-sm rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-semibold text-gold-bright">
          {mode === "login" ? "Bienvenido de nuevo" : "Únete a CAPRI"}
        </h2>
        <p className="mt-1 text-sm text-ink-soft">
          {mode === "login" ? "Entra a tu cuenta para jugar." : "Crea tu cuenta gratis y recibe FUN de bienvenida."}
        </p>

        <form onSubmit={submit} className="mt-5 space-y-3">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            autoComplete="email"
            className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm text-ink placeholder:text-ink-mute focus:border-gold/60 focus:outline-none"
          />
          {mode === "register" && (
            <input
              type="text"
              required
              minLength={3}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Nombre de usuario"
              autoComplete="username"
              className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm text-ink placeholder:text-ink-mute focus:border-gold/60 focus:outline-none"
            />
          )}
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña (mín. 8)"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm text-ink placeholder:text-ink-mute focus:border-gold/60 focus:outline-none"
          />

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full cursor-pointer rounded-full bg-gold py-3 text-sm font-bold text-night transition-colors duration-200 hover:bg-gold-bright disabled:opacity-50"
          >
            {busy ? "Un momento…" : mode === "login" ? "Entrar" : "Crear cuenta"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "register" : "login");
            setError("");
          }}
          className="mt-4 w-full cursor-pointer text-center text-xs text-ink-soft transition-colors hover:text-gold-bright"
        >
          {mode === "login" ? "¿No tienes cuenta? Créala gratis" : "¿Ya tienes cuenta? Inicia sesión"}
        </button>
      </div>
    </div>
  );
}
