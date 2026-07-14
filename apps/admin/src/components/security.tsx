"use client";

// Sección de seguridad: activar/desactivar 2FA (TOTP). El documento marca 2FA
// obligatorio para admins; aquí el operador lo habilita con su app authenticator.
import { useCallback, useEffect, useState } from "react";
import { adminApi, AdminApiError } from "@/lib/admin-api";

export function Security() {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    adminApi.twoFactorStatus().then((s) => setEnabled(s.twoFactorEnabled)).catch(() => setEnabled(false));
  }, []);
  useEffect(load, [load]);

  async function startSetup() {
    setMsg(null);
    setSetup(await adminApi.setup2fa());
  }

  async function confirm() {
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.enable2fa(code);
      setSetup(null);
      setCode("");
      setMsg({ ok: true, text: "2FA activado. La próxima vez te pedirá el código al entrar." });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof AdminApiError ? e.message : "No se pudo activar." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      await adminApi.disable2fa(code);
      setCode("");
      setMsg({ ok: true, text: "2FA desactivado." });
      load();
    } catch (e) {
      setMsg({ ok: false, text: e instanceof AdminApiError ? e.message : "No se pudo desactivar." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-lg">
      <h1 className="mb-1 text-xl font-semibold">Seguridad</h1>
      <p className="mb-6 text-sm text-ink-soft">Verificación en dos pasos (2FA) para tu cuenta de administrador.</p>

      <div className="rounded-xl border border-line bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold">Autenticación en dos pasos</h2>
            <p className="mt-0.5 text-xs text-ink-mute">
              Estado:{" "}
              {enabled === null ? "…" : enabled ? <span className="text-win">activada</span> : <span className="text-danger">desactivada</span>}
            </p>
          </div>
        </div>

        {/* Activar */}
        {enabled === false && !setup && (
          <button onClick={startSetup} className="mt-4 cursor-pointer rounded-full bg-gold px-5 py-2.5 text-sm font-bold text-night transition-colors hover:bg-gold-bright">
            Activar 2FA
          </button>
        )}

        {enabled === false && setup && (
          <div className="mt-4 space-y-3">
            <p className="text-sm text-ink-soft">
              1. Abre tu app de autenticación (Google Authenticator, Authy, 1Password) y añade una cuenta con esta clave:
            </p>
            <code className="block break-all rounded-lg border border-line bg-night px-3 py-2 text-center font-mono text-lg tracking-widest text-gold-bright">
              {setup.secret}
            </code>
            <p className="text-xs text-ink-mute break-all">O usa el enlace: {setup.otpauthUri}</p>
            <p className="text-sm text-ink-soft">2. Introduce el código de 6 dígitos que muestra la app:</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-center text-lg tracking-[0.4em] focus:border-gold/60 focus:outline-none"
              />
              <button onClick={confirm} disabled={busy || code.length !== 6} className="shrink-0 cursor-pointer rounded-lg bg-gold px-5 text-sm font-bold text-night transition-colors hover:bg-gold-bright disabled:opacity-50">
                Confirmar
              </button>
            </div>
          </div>
        )}

        {/* Desactivar */}
        {enabled === true && (
          <div className="mt-4 space-y-2">
            <p className="text-xs text-ink-mute">Para desactivarla, confirma con un código actual de tu app.</p>
            <div className="flex gap-2">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                inputMode="numeric"
                className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-center text-lg tracking-[0.4em] focus:border-gold/60 focus:outline-none"
              />
              <button onClick={disable} disabled={busy || code.length !== 6} className="shrink-0 cursor-pointer rounded-lg border border-danger/60 px-5 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50">
                Desactivar
              </button>
            </div>
          </div>
        )}

        {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-win" : "text-danger"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
