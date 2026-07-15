"use client";

// Club VIP del jugador: nivel actual, progreso al siguiente y la tabla de niveles.
import { useEffect, useState } from "react";
import { api, type VipStatus, type BonusRow } from "@/lib/api";

const fmt = (cents: number) => new Intl.NumberFormat("es-ES").format(Math.floor(cents / 100));

const tierColor: Record<string, string> = {
  Marina: "text-ink-soft",
  Anacapri: "text-azure",
  Faraglioni: "text-gold-bright",
  "Grotta Azzurra": "text-gold-gradient",
};

export function VipModal({ onClose }: { onClose: () => void }) {
  const [vip, setVip] = useState<VipStatus | null>(null);
  const [bonuses, setBonuses] = useState<BonusRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api.vipStatus().then(setVip).catch(() => setError("No se pudo cargar tu estado VIP."));
    api.bonuses().then(setBonuses).catch(() => undefined);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Club VIP y recompensas" onClick={onClose}>
      <div className="glass max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-semibold text-gold-bright">Club VIP y recompensas</h2>
        {error && <p className="mt-3 text-sm text-danger">{error}</p>}

        {/* Bonos activos con progreso de wagering (transparencia = confianza) */}
        {bonuses.length > 0 && (
          <div className="mt-4 space-y-3">
            <p className="text-[0.65rem] uppercase tracking-wider text-ink-mute">Tus bonos activos</p>
            {bonuses.map((b) => (
              <div key={b.id} className="rounded-xl border border-win/30 bg-win/5 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-win">Bono de {fmt(b.amount)} USD</span>
                  <span className="text-xs text-ink-mute">{b.progressPct}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-night">
                  <div className="h-full rounded-full bg-win" style={{ width: `${b.progressPct}%` }} />
                </div>
                <p className="mt-1.5 text-[0.7rem] text-ink-mute">
                  Apostado {fmt(b.wageringProgress)} de {fmt(b.wageringTarget)} USD para liberarlo a tu saldo.
                </p>
              </div>
            ))}
          </div>
        )}

        {vip && (
          <>
            {/* Nivel actual + progreso */}
            <div className="mt-4 rounded-xl border border-line bg-card p-5">
              <p className="text-[0.65rem] uppercase tracking-wider text-ink-mute">Tu nivel</p>
              <p className={`font-display text-3xl font-semibold ${tierColor[vip.tier] ?? "text-ink"}`}>{vip.tier}</p>
              <p className="mt-1 text-xs text-ink-soft">
                Apostado acumulado: <strong className="text-ink">{fmt(vip.totalWagered)} USD</strong>
                {vip.cashbackPct > 0 && <> · Cashback {vip.cashbackPct}%</>}
              </p>

              {vip.nextTier ? (
                <div className="mt-4">
                  <div className="mb-1 flex justify-between text-xs text-ink-mute">
                    <span>Progreso a {vip.nextTier}</span>
                    <span>{vip.progressPct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-night">
                    <div className="h-full rounded-full bg-gradient-to-r from-azure to-gold" style={{ width: `${vip.progressPct}%` }} />
                  </div>
                  <p className="mt-1.5 text-[0.7rem] text-ink-mute">
                    Te faltan <strong className="text-gold-bright">{fmt(vip.wageredToNext)} USD</strong> apostados para {vip.nextTier}.
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-gold-bright">¡Has alcanzado el nivel máximo! 🏆</p>
              )}
            </div>

            {/* Tabla de niveles */}
            <div className="mt-5 space-y-2">
              <p className="text-[0.65rem] uppercase tracking-wider text-ink-mute">Los niveles de la isla</p>
              {vip.tiers.map((t, i) => (
                <div key={t.name} className={`rounded-lg border p-3 ${i === vip.level ? "border-gold/50 bg-gold/10" : "border-line bg-card"}`}>
                  <div className="flex items-baseline justify-between">
                    <span className={`text-sm font-semibold ${tierColor[t.name] ?? "text-ink"}`}>{t.name}</span>
                    <span className="text-[0.65rem] text-ink-mute">
                      {t.minWagered === 0 ? "desde el inicio" : `${fmt(t.minWagered)} USD apostados`}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-ink-soft">{t.perks}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <button type="button" onClick={onClose} className="mt-6 w-full cursor-pointer rounded-full border border-line py-2.5 text-sm text-ink-soft transition-colors hover:text-ink">
          Cerrar
        </button>
      </div>
    </div>
  );
}
