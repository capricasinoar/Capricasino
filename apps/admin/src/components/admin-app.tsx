"use client";

import { useEffect, useState } from "react";
import { adminApi, getToken, setToken } from "@/lib/admin-api";
import { Login } from "./login";
import { Dashboard } from "./dashboard";
import { Clients } from "./clients";
import { ClientDetail } from "./client-detail";
import { AuditLog } from "./audit-log";

type View = { name: "dashboard" } | { name: "clients" } | { name: "client"; id: string } | { name: "audit" };

export function AdminApp() {
  const [admin, setAdmin] = useState<{ email: string; role: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>({ name: "dashboard" });

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    adminApi
      .me()
      .then((me) => setAdmin({ email: me.email, role: me.role }))
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  if (!ready) return <div className="grid min-h-dvh place-items-center text-ink-mute">Cargando…</div>;
  if (!admin) return <Login onDone={(a) => setAdmin(a)} />;

  const nav: { key: View["name"]; label: string }[] = [
    { key: "dashboard", label: "Resumen" },
    { key: "clients", label: "Clientes" },
    { key: "audit", label: "Auditoría" },
  ];

  return (
    <div className="min-h-dvh">
      <header className="border-b border-line bg-surface/70">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4">
          <span className="font-semibold tracking-[0.2em] text-gold-bright">CAPRI · ADMIN</span>
          <nav className="flex gap-1">
            {nav.map((n) => (
              <button
                key={n.key}
                onClick={() => setView({ name: n.key } as View)}
                className={`cursor-pointer rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  view.name === n.key || (view.name === "client" && n.key === "clients")
                    ? "bg-gold/15 font-semibold text-gold-bright"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {n.label}
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-3 text-sm text-ink-mute">
            <span>
              {admin.email} · <span className="text-azure">{admin.role}</span>
            </span>
            <button
              onClick={() => {
                setToken(null);
                setAdmin(null);
              }}
              className="cursor-pointer rounded-lg border border-line px-3 py-1.5 text-ink-soft transition-colors hover:border-gold/60 hover:text-ink"
            >
              Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {view.name === "dashboard" && <Dashboard onOpenClients={() => setView({ name: "clients" })} />}
        {view.name === "clients" && <Clients onOpen={(id) => setView({ name: "client", id })} />}
        {view.name === "client" && (
          <ClientDetail id={view.id} role={admin.role} onBack={() => setView({ name: "clients" })} />
        )}
        {view.name === "audit" && <AuditLog />}
      </main>
    </div>
  );
}
