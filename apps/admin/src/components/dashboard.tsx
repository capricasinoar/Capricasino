"use client";

import { useEffect, useState } from "react";
import { adminApi, fun, type Dashboard as DashboardData } from "@/lib/admin-api";

function Kpi({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-line bg-card p-5">
      <p className="text-[0.65rem] uppercase tracking-wider text-ink-mute">{label}</p>
      <p className={`mt-1.5 text-2xl font-semibold ${accent ?? "text-ink"}`}>{value}</p>
    </div>
  );
}

export function Dashboard({ onOpenClients }: { onOpenClients: () => void }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.dashboard().then(setData).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;
  if (!data) return <p className="text-ink-mute">Cargando resumen…</p>;

  return (
    <div>
      <h1 className="mb-6 text-xl font-semibold">Resumen de la plataforma</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <button onClick={onOpenClients} className="cursor-pointer text-left">
          <Kpi label="Clientes" value={String(data.players)} accent="text-gold-bright" />
        </button>
        <Kpi label="Saldo en circulación" value={fun(data.balanceInCirculation)} accent="text-gold-bright" />
        <Kpi label="GGR (apuestas − premios)" value={fun(data.ggr)} accent={data.ggr >= 0 ? "text-win" : "text-danger"} />
        <Kpi label="Sesiones de juego abiertas" value={String(data.openSessions)} />
        <Kpi label="Total apostado" value={fun(data.totalBets)} />
        <Kpi label="Total en premios" value={fun(data.totalWins)} />
        <Kpi label="Cargas registradas" value={fun(data.deposits)} accent="text-azure" />
        <Kpi label="Retiradas registradas" value={fun(data.withdrawals)} accent="text-azure" />
      </div>
      <p className="mt-6 text-xs text-ink-mute">
        {data.txLast24h} movimientos en las últimas 24 h · GGR es la ganancia bruta de la casa (dinero ficticio).
      </p>
    </div>
  );
}
