"use client";

import { useEffect, useState } from "react";
import { adminApi, type AuditRow } from "@/lib/admin-api";

function summarize(v: unknown): string {
  if (!v || typeof v !== "object") return "";
  return Object.entries(v as Record<string, unknown>)
    .map(([k, val]) => `${k}: ${val}`)
    .join(" · ");
}

export function AuditLog() {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    adminApi.auditLogs().then(setRows).catch((e) => setError(e.message));
  }, []);

  if (error) return <p className="text-danger">{error}</p>;

  return (
    <div>
      <h1 className="mb-2 text-xl font-semibold">Auditoría</h1>
      <p className="mb-5 text-xs text-ink-mute">
        Registro inmutable de acciones sensibles: quién, qué, cuándo y valores antes/después.
      </p>

      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-surface text-left text-xs uppercase tracking-wider text-ink-mute">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Acción</th>
              <th className="px-4 py-3">Administrador</th>
              <th className="px-4 py-3">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-ink-mute">Sin registros</td></tr>
            ) : (
              rows.map((l) => (
                <tr key={l.id} className="border-t border-line/60">
                  <td className="px-4 py-3 text-xs text-ink-mute">{l.createdAt.replace("T", " ").slice(0, 19)}</td>
                  <td className="px-4 py-3 font-medium text-gold-bright">{l.action}</td>
                  <td className="px-4 py-3 text-ink-soft">{l.admin}</td>
                  <td className="px-4 py-3 text-xs text-ink-mute">
                    {summarize(l.after)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
