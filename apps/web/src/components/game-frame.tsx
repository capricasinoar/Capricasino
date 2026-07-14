"use client";

// Abre un juego lanzado en un <iframe> (el juego corre en el provider-sim).
// Al cerrar, resincroniza el saldo por REST (la verdad es la DB — Cap. 9.3).
import { useEffect, useState } from "react";
import type { CatalogGame } from "@/lib/catalog";
import { api, ApiError } from "@/lib/api";
import { session } from "@/lib/session-store";

export function GameFrame({ game, onClose }: { game: CatalogGame; onClose: () => void }) {
  const [gameUrl, setGameUrl] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .launch(game.slug)
      .then((res) => {
        if (alive) setGameUrl(res.gameUrl);
      })
      .catch((e) => {
        if (!alive) return;
        setError(
          e instanceof ApiError
            ? e.code === "GAME_NOT_FOUND" || e.code === "PROVIDER_UNAVAILABLE"
              ? "Este juego todavía no está disponible para jugar."
              : e.message
            : "No se pudo abrir el juego.",
        );
      });
    return () => {
      alive = false;
    };
  }, [game.slug]);

  function close() {
    session.refreshBalance(); // resync tras jugar
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-night/95 backdrop-blur-sm">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <span className="font-display text-lg font-semibold text-gold-bright">{game.name}</span>
        <button
          type="button"
          onClick={close}
          className="cursor-pointer rounded-full border border-line px-4 py-1.5 text-sm text-ink-soft transition-colors hover:border-gold/60 hover:text-ink"
        >
          Cerrar ✕
        </button>
      </div>

      <div className="flex flex-1 items-center justify-center p-2 md:p-4">
        {error ? (
          <p className="max-w-sm text-center text-sm text-ink-soft">{error}</p>
        ) : gameUrl ? (
          <iframe
            src={gameUrl}
            title={game.name}
            className="h-full w-full max-w-2xl rounded-xl border border-line bg-night"
            sandbox="allow-scripts allow-same-origin allow-forms"
          />
        ) : (
          <p className="text-sm text-ink-mute">Cargando {game.name}…</p>
        )}
      </div>
    </div>
  );
}
