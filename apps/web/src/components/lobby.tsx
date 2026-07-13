"use client";

// Lobby demo con catálogo mock (src/lib/games.ts) y saldo ficticio local.
// Semana 4+: catálogo desde GET /api/v1/games; saldo real desde el wallet vía WS.

import { useMemo, useState } from "react";
import Link from "next/link";
import { CATEGORIES, GAMES, gamesByCategory, type CategorySlug, type MockGame } from "@/lib/games";
import { GameCard } from "./game-card";
import { Logo } from "./logo";

const WELCOME_FUN = 100_000;

function formatFun(n: number) {
  return new Intl.NumberFormat("es-ES").format(n);
}

export function Lobby() {
  const [category, setCategory] = useState<CategorySlug>("todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<MockGame | null>(null);

  const games = useMemo(() => {
    const base = gamesByCategory(category);
    const q = query.trim().toLowerCase();
    return q ? base.filter((g) => g.name.toLowerCase().includes(q)) : base;
  }, [category, query]);

  const featured = GAMES.filter((g) => g.featured);

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      {/* ── Barra superior ── */}
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link href="/" className="cursor-pointer" aria-label="Volver a la portada">
            <Logo compact />
          </Link>

          <div className="relative mx-auto w-full max-w-md">
            <svg
              viewBox="0 0 24 24"
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar juegos…"
              aria-label="Buscar juegos"
              className="w-full rounded-full border border-line bg-card py-2.5 pl-10 pr-4 text-sm text-ink placeholder:text-ink-mute focus:border-gold/60 focus:outline-none"
            />
          </div>

          {/* saldo ficticio */}
          <div className="flex shrink-0 items-center gap-2">
            <div className="rounded-full border border-gold/35 bg-gold/10 px-4 py-2 text-sm font-semibold text-gold-bright">
              {formatFun(WELCOME_FUN)} <span className="text-[0.65rem] font-bold">FUN</span>
            </div>
            <button
              type="button"
              onClick={() => setSelected({ name: "Depósitos", slug: "__deposit", provider: "", type: "original", icon: "coin", gradient: "" })}
              className="hidden cursor-pointer rounded-full bg-gold px-4 py-2 text-sm font-bold text-night transition-colors duration-200 hover:bg-gold-bright md:block"
            >
              Recargar
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 pt-6 md:px-6">
        {/* ── Sidebar categorías (desktop) ── */}
        <aside className="hidden w-44 shrink-0 lg:block" aria-label="Categorías">
          <nav className="sticky top-24 space-y-1">
            {CATEGORIES.map((c) => {
              const active = c.slug === category;
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => setCategory(c.slug)}
                  className={`block w-full cursor-pointer rounded-lg px-4 py-2.5 text-left text-sm transition-colors duration-150 ${
                    active ? "bg-gold/15 font-semibold text-gold-bright" : "text-ink-soft hover:bg-card hover:text-ink"
                  }`}
                >
                  {c.name}
                  <span className="float-right text-xs text-ink-mute">{gamesByCategory(c.slug).length}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* ── Contenido ── */}
        <main className="min-w-0 flex-1">
          {/* chips categorías (móvil/tablet) */}
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden" role="tablist" aria-label="Categorías">
            {CATEGORIES.map((c) => {
              const active = c.slug === category;
              return (
                <button
                  key={c.slug}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setCategory(c.slug)}
                  className={`shrink-0 cursor-pointer rounded-full px-4 py-2 text-sm transition-colors duration-150 ${
                    active ? "bg-gold font-semibold text-night" : "border border-line text-ink-soft hover:text-ink"
                  }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>

          {/* Destacados (solo sin búsqueda y en "todos") */}
          {category === "todos" && !query.trim() && (
            <section className="mb-8" aria-label="Destacados">
              <h2 className="font-display mb-3 text-xl font-semibold">Destacados</h2>
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {featured.map((g) => (
                  <div key={g.slug} className="w-32 shrink-0 snap-start md:w-40">
                    <GameCard game={g} onPlay={setSelected} />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section aria-label="Catálogo">
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="font-display text-xl font-semibold">
                {CATEGORIES.find((c) => c.slug === category)?.name}
              </h2>
              <span className="text-xs text-ink-mute">
                {games.length} {games.length === 1 ? "juego" : "juegos"}
              </span>
            </div>

            {games.length === 0 ? (
              <p className="rounded-xl border border-line bg-card px-4 py-10 text-center text-sm text-ink-mute">
                Sin resultados para «{query}». Prueba con otro nombre.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 xl:grid-cols-5">
                {games.map((g) => (
                  <GameCard key={g.slug} game={g} onPlay={setSelected} />
                ))}
              </div>
            )}
          </section>

          <p className="mt-10 border-t border-line pt-5 pb-8 text-center text-xs text-ink-mute">
            Demo · dinero 100% ficticio (FUN) · los juegos se conectan al provider-sim en la Semana 3 del roadmap
          </p>
        </main>
      </div>

      {/* ── Nav inferior (móvil) ── */}
      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around py-2.5 md:hidden" aria-label="Navegación móvil">
        <Link href="/" className="cursor-pointer px-4 py-1 text-xs font-medium text-ink-soft">Portada</Link>
        <button type="button" onClick={() => setCategory("originals")} className="cursor-pointer px-4 py-1 text-xs font-medium text-gold-bright">
          Originals
        </button>
        <button type="button" onClick={() => setCategory("slots")} className="cursor-pointer px-4 py-1 text-xs font-medium text-ink-soft">
          Slots
        </button>
        <Link href="/#promos" className="cursor-pointer px-4 py-1 text-xs font-medium text-ink-soft">Promos</Link>
      </nav>

      {/* ── Modal demo ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Información de ${selected.name}`}
          onClick={() => setSelected(null)}
        >
          <div className="glass w-full max-w-sm rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-semibold text-gold-bright">
              {selected.slug === "__deposit" ? "Recarga de FUN" : selected.name}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              {selected.slug === "__deposit"
                ? "En la plataforma completa, este botón acredita FUN al instante a través del wallet (depósito fake, Semana 8 del roadmap)."
                : "Demo de portfolio: este juego se conecta al provider-sim con apuestas reales contra el wallet en la Semana 3 del roadmap."}
            </p>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mt-6 cursor-pointer rounded-full bg-gold px-6 py-2.5 text-sm font-bold text-night transition-colors duration-200 hover:bg-gold-bright"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
