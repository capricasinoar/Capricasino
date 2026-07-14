"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type TxRow } from "@/lib/api";

const fun = (c: number) => new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2 }).format(c / 100);

const TABS = [
  { key: "", label: "Todos" },
  { key: "money", label: "Cargas y retiros" },
  { key: "game", label: "Apuestas" },
] as const;

// Etiqueta y color por tipo de transacción.
const meta: Record<string, { label: string; tone: string; sign: 1 | -1 }> = {
  deposit: { label: "Carga", tone: "text-azure", sign: 1 },
  withdrawal: { label: "Retiro", tone: "text-azure", sign: -1 },
  bet: { label: "Apuesta", tone: "text-ink-soft", sign: -1 },
  win: { label: "Premio", tone: "text-win", sign: 1 },
  rollback: { label: "Reversión", tone: "text-gold-bright", sign: 1 },
  adjustment: { label: "Ajuste", tone: "text-gold-bright", sign: 1 },
  cashback: { label: "Cashback", tone: "text-win", sign: 1 },
  bonus_grant: { label: "Bono", tone: "text-win", sign: 1 },
};

export function HistoryModal({ onClose }: { onClose: () => void }) {
  const [group, setGroup] = useState<"" | "money" | "game">("");
  const [items, setItems] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api
      .transactions(group || undefined)
      .then((p) => setItems(p.items))
      .finally(() => setLoading(false));
  }, [group]);
  useEffect(load, [load]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Historial de movimientos" onClick={onClose}>
      <div className="glass flex max-h-[85dvh] w-full max-w-lg flex-col rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-2xl font-semibold text-gold-bright">Historial</h2>
          <button onClick={onClose} className="cursor-pointer text-sm text-ink-mute hover:text-ink">✕</button>
        </div>

        <div className="mb-4 flex gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setGroup(t.key)}
              className={`cursor-pointer rounded-full px-3.5 py-1.5 text-sm transition-colors ${
                group === t.key ? "bg-gold font-semibold text-night" : "border border-line text-ink-soft hover:text-ink"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {loading ? (
            <p className="py-10 text-center text-sm text-ink-mute">Cargando…</p>
          ) : items.length === 0 ? (
            <p className="py-10 text-center text-sm text-ink-mute">No hay movimientos en esta categoría.</p>
          ) : (
            <ul className="divide-y divide-line/50">
              {items.map((t) => {
                const m = meta[t.type] ?? { label: t.type, tone: "text-ink-soft", sign: 1 as const };
                return (
                  <li key={t.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <span className={`text-sm font-medium ${m.tone}`}>{m.label}</span>
                      <div className="text-[0.65rem] text-ink-mute">{t.createdAt.replace("T", " ").slice(0, 19)}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-semibold ${m.sign > 0 ? "text-win" : "text-ink"}`}>
                        {m.sign > 0 ? "+" : "−"}
                        {fun(t.amount)} FUN
                      </div>
                      {t.balanceAfter !== null && <div className="text-[0.65rem] text-ink-mute">saldo {fun(t.balanceAfter)}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
