"use client";

import { useEffect, useRef, useState } from "react";
import { api, type NotificationRow } from "@/lib/api";
import { session, usePlayerSession } from "@/lib/session-store";

const fun = (c: number) => new Intl.NumberFormat("es-ES").format(Math.floor(c / 100));

function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "ahora";
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`;
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`;
  return `hace ${Math.floor(s / 86400)} d`;
}

function render(n: NotificationRow): { title: string; body: string; tone: string } {
  const amount = n.payload?.amount ? `${fun(n.payload.amount)} USD` : "";
  const reason = n.payload?.reason ? ` · ${n.payload.reason}` : "";
  switch (n.type) {
    case "deposit":
      return { title: "Saldo acreditado", body: `Tu operador te ha acreditado ${amount}${reason}`, tone: "text-win" };
    case "withdrawal":
      return { title: "Retiro procesado", body: `Se han retirado ${amount} de tu saldo${reason}`, tone: "text-azure" };
    case "welcome":
      return { title: "¡Bienvenido a CAPRI!", body: "Tu cuenta está lista. Pídele saldo a tu operador para empezar.", tone: "text-gold-bright" };
    case "excluded":
      return { title: "Autoexclusión activa", body: "No podrás jugar durante el periodo indicado.", tone: "text-danger" };
    default:
      return { title: "Notificación", body: "", tone: "text-ink-soft" };
  }
}

export function NotificationsBell() {
  const player = usePlayerSession();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      try {
        const page = await api.notifications();
        setItems(page.items);
        // Marcar como leídas las no leídas visibles.
        const unreadIds = page.items.filter((n) => !n.read).map((n) => n.id);
        if (unreadIds.length) {
          const res = await api.markNotificationsRead(unreadIds);
          session.setUnread(res.unread);
        }
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={toggle}
        className="relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-line text-ink-soft transition-colors hover:border-gold/60 hover:text-ink"
        aria-label={`Notificaciones${player.unread ? ` (${player.unread} sin leer)` : ""}`}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {player.unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[0.6rem] font-bold text-white">
            {player.unread > 9 ? "9+" : player.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-line bg-card shadow-2xl shadow-black/50">
          <div className="border-b border-line px-4 py-3 text-sm font-semibold">Notificaciones</div>
          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <p className="px-4 py-8 text-center text-sm text-ink-mute">Cargando…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-ink-mute">No tienes notificaciones.</p>
            ) : (
              items.map((n) => {
                const r = render(n);
                return (
                  <div key={n.id} className={`border-b border-line/50 px-4 py-3 ${n.read ? "" : "bg-gold/[0.04]"}`}>
                    <div className="flex items-baseline justify-between gap-2">
                      <span className={`text-sm font-semibold ${r.tone}`}>{r.title}</span>
                      <span className="shrink-0 text-[0.65rem] text-ink-mute">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-xs text-ink-soft">{r.body}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
