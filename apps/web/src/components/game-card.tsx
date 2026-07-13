"use client";

import type { MockGame } from "@/lib/games";
import { GameIcon } from "./game-icons";

const badgeStyles: Record<NonNullable<MockGame["badge"]>, string> = {
  HOT: "bg-danger/90 text-white",
  NUEVO: "bg-azure/90 text-night",
  PRONTO: "bg-ink-mute/80 text-night",
};

export function GameCard({ game, onPlay }: { game: MockGame; onPlay?: (g: MockGame) => void }) {
  const disabled = game.badge === "PRONTO";
  return (
    <button
      type="button"
      onClick={() => !disabled && onPlay?.(game)}
      className={`group relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-line bg-gradient-to-br ${game.gradient} text-left transition-transform duration-200 ${
        disabled ? "cursor-default opacity-70" : "cursor-pointer hover:-translate-y-1 hover:border-gold/50"
      } focus-visible:outline-2 focus-visible:outline-gold`}
      aria-label={disabled ? `${game.name} (próximamente)` : `Jugar a ${game.name}`}
    >
      {/* textura sutil */}
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.10),transparent_55%)]" />

      {game.badge && (
        <span className={`absolute right-2 top-2 z-10 rounded-full px-2 py-0.5 text-[0.6rem] font-bold tracking-wider ${badgeStyles[game.badge]}`}>
          {game.badge}
        </span>
      )}

      <span className="absolute inset-0 flex items-center justify-center text-ink/85 transition-transform duration-200 group-hover:scale-110">
        <GameIcon icon={game.icon} className="h-12 w-12 md:h-14 md:w-14" />
      </span>

      <span className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-3 pt-8">
        <span className="block truncate text-sm font-semibold text-ink">{game.name}</span>
        <span className="mt-0.5 flex items-center justify-between text-[0.65rem] text-ink-soft">
          <span className="truncate">{game.provider}</span>
          {game.rtp && <span className="ml-2 shrink-0 text-gold-bright">RTP {game.rtp}%</span>}
        </span>
      </span>

      {/* overlay Jugar */}
      {!disabled && (
        <span className="absolute inset-0 z-10 flex items-center justify-center bg-night/60 opacity-0 backdrop-blur-[2px] transition-opacity duration-200 group-hover:opacity-100">
          <span className="rounded-full bg-gold px-5 py-2 text-sm font-bold text-night shadow-lg shadow-gold/25">Jugar</span>
        </span>
      )}
    </button>
  );
}
