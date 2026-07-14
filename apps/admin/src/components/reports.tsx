"use client";

import { useEffect, useState } from "react";
import { adminApi, downloadClientActivityCsv, fun, type GgrDay, type ClientActivity } from "@/lib/admin-api";

export function Reports() {
  const [ggr, setGgr] = useState<GgrDay[]>([]);
  const [clients, setClients] = useState<ClientActivity[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([adminApi.ggr(30), adminApi.clientActivity()])
      .then(([g, c]) => {
        setGgr(g);
        setClients(c);
      })
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;

  const totalGgr = ggr.reduce((a, d) => a + d.ggr, 0);

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Reportes</h1>
        <button
          onClick={() => downloadClientActivityCsv().catch(() => setError("No se pudo descargar el CSV"))}
          className="cursor-pointer rounded-full bg-gold px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gold-bright"
        >
          Descargar actividad (CSV)
        </button>
      </div>

      {/* GGR por día */}
      <section className="mb-8">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-ink-soft">GGR por día (últimos 30 días)</h2>
          <span className="text-xs text-ink-mute">Total: <strong className={totalGgr >= 0 ? "text-win" : "text-danger"}>{fun(totalGgr)}</strong></span>
        </div>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-mute">
              <tr>
                <th className="px-4 py-3">Día</th>
                <th className="px-4 py-3 text-right">Apostado</th>
                <th className="px-4 py-3 text-right">Premios</th>
                <th className="px-4 py-3 text-right">GGR</th>
                <th className="px-4 py-3 text-right">Cargas</th>
                <th className="px-4 py-3 text-right">Retiradas</th>
              </tr>
            </thead>
            <tbody>
              {ggr.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-mute">Sin actividad todavía</td></tr>
              ) : (
                ggr.map((d) => (
                  <tr key={d.day} className="border-t border-line/60">
                    <td className="px-4 py-2.5 text-ink-soft">{d.day}</td>
                    <td className="px-4 py-2.5 text-right">{fun(d.bets)}</td>
                    <td className="px-4 py-2.5 text-right">{fun(d.wins)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${d.ggr >= 0 ? "text-win" : "text-danger"}`}>{fun(d.ggr)}</td>
                    <td className="px-4 py-2.5 text-right text-azure">{fun(d.deposits)}</td>
                    <td className="px-4 py-2.5 text-right text-azure">{fun(d.withdrawals)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Actividad por cliente */}
      <section>
        <h2 className="mb-2 text-sm font-semibold text-ink-soft">Actividad por cliente</h2>
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-mute">
              <tr>
                <th className="px-4 py-3">Cliente</th>
                <th className="px-4 py-3 text-right">Apostado</th>
                <th className="px-4 py-3 text-right">Premios</th>
                <th className="px-4 py-3 text-right">GGR</th>
                <th className="px-4 py-3 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((c) => (
                <tr key={c.userId} className="border-t border-line/60">
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-ink">{c.username}</div>
                    <div className="text-xs text-ink-mute">{c.email}</div>
                  </td>
                  <td className="px-4 py-2.5 text-right">{fun(c.bets)}</td>
                  <td className="px-4 py-2.5 text-right">{fun(c.wins)}</td>
                  <td className={`px-4 py-2.5 text-right font-medium ${c.ggr >= 0 ? "text-win" : "text-danger"}`}>{fun(c.ggr)}</td>
                  <td className="px-4 py-2.5 text-right text-gold-bright">{fun(c.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
