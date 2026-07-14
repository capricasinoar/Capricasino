"use client";

import { useCallback, useEffect, useState } from "react";
import { adminApi, fun, AdminApiError, type UserDetail } from "@/lib/admin-api";

const txColor: Record<string, string> = {
  deposit: "text-azure",
  withdrawal: "text-azure",
  bet: "text-ink-soft",
  win: "text-win",
  rollback: "text-gold-bright",
  adjustment: "text-gold-bright",
};

export function ClientDetail({ id, role, onBack }: { id: string; role: string; onBack: () => void }) {
  const [data, setData] = useState<UserDetail | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    adminApi.user(id).then(setData).catch((e) => setError(e.message));
  }, [id]);
  useEffect(load, [load]);

  const canAdjust = role === "super_admin" || role === "finance";

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-ink-mute">Cargando cliente…</p>;

  return (
    <div>
      <button onClick={onBack} className="mb-4 cursor-pointer text-sm text-ink-soft hover:text-ink">
        ← Volver a clientes
      </button>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        {/* Columna izquierda: identidad + saldo + carga/retirada */}
        <div className="space-y-4">
          <div className="rounded-xl border border-line bg-card p-5">
            <h1 className="text-lg font-semibold text-ink">{data.username}</h1>
            <p className="text-xs text-ink-mute">{data.email}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-gold/30 bg-gold/10 p-3">
                <p className="text-[0.6rem] uppercase tracking-wider text-ink-mute">Saldo cash</p>
                <p className="mt-0.5 text-xl font-semibold text-gold-bright">{fun(data.cash)}</p>
              </div>
              <div className="rounded-lg border border-line bg-night p-3">
                <p className="text-[0.6rem] uppercase tracking-wider text-ink-mute">Bono</p>
                <p className="mt-0.5 text-xl font-semibold text-ink-soft">{fun(data.bonus)}</p>
              </div>
            </div>
            <p className="mt-3 text-xs text-ink-mute">
              Estado: <span className="text-ink-soft">{data.status}</span> · alta {data.createdAt.slice(0, 10)}
            </p>
          </div>

          {canAdjust ? (
            <AdjustForm userId={id} onDone={load} />
          ) : (
            <p className="rounded-xl border border-line bg-card p-4 text-xs text-ink-mute">
              Tu rol ({role}) no permite modificar saldo. Solo finance o super_admin.
            </p>
          )}
        </div>

        {/* Columna derecha: historial con ledger */}
        <div className="rounded-xl border border-line bg-card">
          <h2 className="border-b border-line px-5 py-3 text-sm font-semibold">Movimientos recientes</h2>
          <div className="max-h-[32rem] overflow-y-auto">
            {data.transactions.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-mute">Sin movimientos todavía</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {data.transactions.map((t) => (
                    <tr key={t.id} className="border-t border-line/60">
                      <td className="px-5 py-2.5">
                        <span className={`font-medium ${txColor[t.type] ?? "text-ink"}`}>{t.type}</span>
                        <div className="text-[0.65rem] text-ink-mute">{t.createdAt.replace("T", " ").slice(0, 19)}</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-medium">{fun(t.amount)}</td>
                      <td className="px-5 py-2.5 text-right text-xs text-ink-mute">
                        {t.balanceAfter === null ? "" : `saldo ${fun(t.balanceAfter)}`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {data.sessions.length > 0 && (
        <div className="mt-6 rounded-xl border border-line bg-card p-5">
          <h2 className="mb-3 text-sm font-semibold">Sesiones de juego</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {data.sessions.map((s) => (
              <span key={s.id} className="rounded-full border border-line px-3 py-1 text-ink-soft">
                {s.game} · <span className={s.status === "open" ? "text-win" : "text-ink-mute"}>{s.status}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AdjustForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [kind, setKind] = useState<"deposit" | "withdrawal">("deposit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    const funAmount = Number(amount);
    if (!Number.isFinite(funAmount) || funAmount <= 0) {
      setMsg({ ok: false, text: "Introduce un monto válido en FUN" });
      return;
    }
    setBusy(true);
    try {
      const res = await adminApi.adjust(userId, kind, Math.round(funAmount * 100), reason.trim());
      setMsg({
        ok: true,
        text: `${kind === "deposit" ? "Carga" : "Retirada"} registrada. Nuevo saldo: ${fun(res.balanceAfter)}`,
      });
      setAmount("");
      setReason("");
      onDone();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof AdminApiError ? err.message : "Error al ajustar el saldo" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-xl border border-line bg-card p-5">
      <h2 className="text-sm font-semibold">Cargar / retirar saldo</h2>
      <p className="mt-1 text-xs text-ink-mute">Queda registrado en el ledger, el recibo y la auditoría.</p>

      <div className="mt-4 flex gap-2">
        {(["deposit", "withdrawal"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={`flex-1 cursor-pointer rounded-lg border px-3 py-2 text-sm transition-colors ${
              kind === k ? "border-gold bg-gold/15 font-semibold text-gold-bright" : "border-line text-ink-soft hover:text-ink"
            }`}
          >
            {k === "deposit" ? "Cargar" : "Retirar"}
          </button>
        ))}
      </div>

      <label className="mt-4 block text-[0.65rem] uppercase tracking-wider text-ink-mute">Monto (FUN)</label>
      <input
        type="number"
        min="0"
        step="0.01"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="500"
        className="mt-1 w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
      />

      <label className="mt-3 block text-[0.65rem] uppercase tracking-wider text-ink-mute">Razón (opcional)</label>
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Carga inicial cliente VIP"
        maxLength={280}
        className="mt-1 w-full rounded-lg border border-line bg-night px-4 py-2.5 text-sm focus:border-gold/60 focus:outline-none"
      />

      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-win" : "text-danger"}`}>{msg.text}</p>}

      <button
        type="submit"
        disabled={busy}
        className="mt-4 w-full cursor-pointer rounded-full bg-gold py-2.5 text-sm font-bold text-night transition-colors hover:bg-gold-bright disabled:opacity-50"
      >
        {busy ? "Registrando…" : kind === "deposit" ? "Cargar saldo" : "Retirar saldo"}
      </button>
    </form>
  );
}
