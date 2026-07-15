"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, fun, AdminApiError, type UserRow } from "@/lib/admin-api";

const statusColor: Record<string, string> = {
  active: "text-win",
  suspended: "text-danger",
  self_excluded: "text-gold-bright",
  closed: "text-ink-mute",
};

export function Clients({ onOpen }: { onOpen: (id: string) => void }) {
  const [rows, setRows] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const reload = useCallback(() => {
    setLoading(true);
    adminApi
      .users(search.trim() || undefined)
      .then(setRows)
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => {
    const t = setTimeout(reload, 250);
    return () => clearTimeout(t);
  }, [reload]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <div className="flex items-center gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por email o usuario…"
            className="w-64 rounded-full border border-line bg-card px-4 py-2 text-sm focus:border-gold/60 focus:outline-none"
          />
          <button
            onClick={() => setCreating(true)}
            className="shrink-0 cursor-pointer rounded-full bg-gold px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gold-bright"
          >
            + Nuevo cliente
          </button>
        </div>
      </div>

      {creating && (
        <NewClientForm
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            reload();
          }}
        />
      )}

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-mute">
            <tr>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3 text-right">Saldo cash</th>
              <th className="px-4 py-3 text-right">Bono</th>
              <th className="px-4 py-3">Alta</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-mute">Cargando…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-mute">Sin clientes</td></tr>
            ) : (
              rows.map((u) => (
                <tr
                  key={u.id}
                  onClick={() => onOpen(u.id)}
                  className="cursor-pointer border-t border-line transition-colors hover:bg-card"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink">{u.username}</div>
                    <div className="text-xs text-ink-mute">{u.email}</div>
                  </td>
                  <td className={`px-4 py-3 ${statusColor[u.status] ?? "text-ink-soft"}`}>{u.status}</td>
                  <td className="px-4 py-3 text-right font-medium text-gold-bright">{fun(u.cash)}</td>
                  <td className="px-4 py-3 text-right text-ink-soft">{fun(u.bonus)}</td>
                  <td className="px-4 py-3 text-xs text-ink-mute">{u.createdAt.slice(0, 10)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function NewClientForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [balance, setBalance] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ username: string; password: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const initial = Number(balance);
      await adminApi.createUser({
        email: email.trim(),
        username: username.trim(),
        password,
        initialBalance: Number.isFinite(initial) && initial > 0 ? Math.round(initial * 100) : undefined,
      });
      // Mostramos las credenciales para que el operador se las pase al cliente.
      setDone({ username: username.trim(), password });
    } catch (err) {
      setError(err instanceof AdminApiError ? err.message : "No se pudo crear el cliente.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl border border-line bg-card p-6" onClick={(e) => e.stopPropagation()}>
        {done ? (
          <div>
            <h2 className="text-lg font-semibold text-win">Cliente creado</h2>
            <p className="mt-2 text-sm text-ink-soft">Pásale estos datos a tu cliente para que entre en la web:</p>
            <div className="mt-3 space-y-1 rounded-lg border border-line bg-night px-4 py-3 text-sm">
              <div>Usuario: <strong className="text-gold-bright">{done.username}</strong></div>
              <div>Contraseña: <strong className="text-gold-bright">{done.password}</strong></div>
            </div>
            <button onClick={onCreated} className="mt-5 w-full cursor-pointer rounded-full bg-gold py-2.5 text-sm font-bold text-night transition-colors hover:bg-gold-bright">
              Hecho
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <h2 className="text-lg font-semibold">Nuevo cliente</h2>
            <p className="mt-1 text-xs text-ink-mute">Solo tú das de alta clientes. Se crea con su saldo inicial opcional.</p>

            <div className="mt-4 space-y-3">
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
                className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none" />
              <input type="text" required minLength={3} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Nombre de usuario"
                className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none" />
              <input type="text" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña (mín. 8)"
                className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none" />
              <div>
                <label className="mb-1 block text-[0.65rem] uppercase tracking-wider text-ink-mute">Saldo inicial (USD, opcional)</label>
                <input type="number" min="0" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="0"
                  className="w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none" />
              </div>
            </div>

            {error && <p className="mt-3 text-sm text-danger">{error}</p>}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={onClose} className="flex-1 cursor-pointer rounded-full border border-line py-2.5 text-sm text-ink-soft transition-colors hover:text-ink">
                Cancelar
              </button>
              <button type="submit" disabled={busy} className="flex-1 cursor-pointer rounded-full bg-gold py-2.5 text-sm font-bold text-night transition-colors hover:bg-gold-bright disabled:opacity-50">
                {busy ? "Creando…" : "Crear cliente"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
