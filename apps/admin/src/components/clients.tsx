"use client";

import { useEffect, useState } from "react";
import { adminApi, fun, type UserRow } from "@/lib/admin-api";

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

  useEffect(() => {
    const t = setTimeout(() => {
      setLoading(true);
      adminApi
        .users(search.trim() || undefined)
        .then(setRows)
        .finally(() => setLoading(false));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold">Clientes</h1>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email o usuario…"
          className="w-72 rounded-full border border-line bg-card px-4 py-2 text-sm focus:border-gold/60 focus:outline-none"
        />
      </div>

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
