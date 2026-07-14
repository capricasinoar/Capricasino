"use client";

// Panel de Juego Responsable del jugador: límites diarios y autoexclusión.
// No mueve dinero — son controles de protección (Cap. 0 costura #4).
import { useEffect, useState } from "react";
import { api, ApiError, type RgStatus } from "@/lib/api";
import { session } from "@/lib/session-store";

const fun = (c: number) => new Intl.NumberFormat("es-ES").format(Math.floor(c / 100));

export function ResponsibleModal({ onClose }: { onClose: () => void }) {
  const [status, setStatus] = useState<RgStatus | null>(null);
  const [wager, setWager] = useState("");
  const [loss, setLoss] = useState("");
  const [msg, setMsg] = useState("");
  const [confirmExcl, setConfirmExcl] = useState(false);

  const load = () => api.rgStatus().then(setStatus).catch(() => setMsg("No se pudo cargar tu configuración."));
  useEffect(() => {
    load();
  }, []);

  const limitOf = (k: string) => status?.limits.find((l) => l.kind === k)?.value ?? null;

  async function saveLimit(kind: "daily_wager" | "daily_loss", raw: string) {
    const funVal = Number(raw);
    if (!Number.isFinite(funVal) || funVal <= 0) {
      setMsg("Introduce un monto válido en FUN.");
      return;
    }
    setMsg("");
    setStatus(await api.rgSetLimit(kind, Math.round(funVal * 100)));
    if (kind === "daily_wager") setWager("");
    else setLoss("");
  }

  async function removeLimit(kind: "daily_wager" | "daily_loss") {
    setStatus(await api.rgRemoveLimit(kind));
  }

  async function selfExclude(days: number | null) {
    try {
      await api.rgSelfExclude(days);
      // La autoexclusión cierra la sesión de juego: salir.
      await session.logout();
      onClose();
    } catch (e) {
      setMsg(e instanceof ApiError ? e.message : "No se pudo aplicar la autoexclusión.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Juego responsable" onClick={onClose}>
      <div className="glass max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <h2 className="font-display text-2xl font-semibold text-gold-bright">Juego responsable</h2>
        <p className="mt-1 text-sm text-ink-soft">Pon límites a tu juego o tómate un descanso. Tú tienes el control.</p>

        {status && (
          <p className="mt-3 rounded-lg border border-line bg-night px-3 py-2 text-xs text-ink-mute">
            Hoy llevas apostado <strong className="text-ink-soft">{fun(status.wageredToday)} FUN</strong> · pérdida neta{" "}
            <strong className="text-ink-soft">{fun(status.netLossToday)} FUN</strong>
          </p>
        )}

        {/* Límites diarios */}
        <div className="mt-5 space-y-4">
          <LimitRow
            title="Límite de apuesta diaria"
            help="Máximo que puedes apostar por día."
            current={limitOf("daily_wager")}
            value={wager}
            onChange={setWager}
            onSave={() => saveLimit("daily_wager", wager)}
            onRemove={() => removeLimit("daily_wager")}
          />
          <LimitRow
            title="Límite de pérdida diaria"
            help="Cuando tu pérdida del día llega a este tope, no puedes apostar más."
            current={limitOf("daily_loss")}
            value={loss}
            onChange={setLoss}
            onSave={() => saveLimit("daily_loss", loss)}
            onRemove={() => removeLimit("daily_loss")}
          />
        </div>

        {msg && <p className="mt-3 text-sm text-danger">{msg}</p>}

        {/* Autoexclusión */}
        <div className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <h3 className="text-sm font-semibold text-ink">Tomarme un descanso (autoexclusión)</h3>
          <p className="mt-1 text-xs text-ink-mute">Mientras dure, no podrás jugar. Se cerrará tu sesión.</p>
          {!confirmExcl ? (
            <button
              type="button"
              onClick={() => setConfirmExcl(true)}
              className="mt-3 cursor-pointer rounded-full border border-danger/60 px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
            >
              Quiero excluirme
            </button>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {[
                ["24 horas", 1],
                ["7 días", 7],
                ["30 días", 30],
                ["Permanente", null],
              ].map(([label, days]) => (
                <button
                  key={label as string}
                  type="button"
                  onClick={() => selfExclude(days as number | null)}
                  className="cursor-pointer rounded-full bg-danger px-3 py-1.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" onClick={onClose} className="mt-6 w-full cursor-pointer rounded-full border border-line py-2.5 text-sm text-ink-soft transition-colors hover:text-ink">
          Cerrar
        </button>
      </div>
    </div>
  );
}

function LimitRow({
  title, help, current, value, onChange, onSave, onRemove,
}: {
  title: string; help: string; current: number | null; value: string;
  onChange: (v: string) => void; onSave: () => void; onRemove: () => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-card p-4">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {current !== null && (
          <span className="text-xs text-gold-bright">
            actual: {fun(current)} FUN
            <button onClick={onRemove} className="ml-2 cursor-pointer text-ink-mute underline hover:text-danger">quitar</button>
          </span>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-mute">{help}</p>
      <div className="mt-2 flex gap-2">
        <input
          type="number" min="0" step="1" value={value} onChange={(e) => onChange(e.target.value)}
          placeholder="FUN"
          className="w-full rounded-lg border border-line bg-night px-3 py-2 text-sm focus:border-gold/60 focus:outline-none"
        />
        <button onClick={onSave} className="shrink-0 cursor-pointer rounded-lg bg-gold px-4 py-2 text-sm font-bold text-night transition-colors hover:bg-gold-bright">
          Guardar
        </button>
      </div>
    </div>
  );
}
