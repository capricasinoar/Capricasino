"use client";

// Lobby con catálogo SERVIDO POR LA API (agnóstico al proveedor): la lista, las
// categorías y qué juego es "jugable" vienen del backend. El día que se enchufe
// un agregador, su catálogo aparece aquí sin tocar este componente.

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { fetchCatalog, fetchCategories, type CatalogGame, type Category } from "@/lib/catalog";
import { GameCard } from "./game-card";
import { Logo } from "./logo";
import { AuthModal } from "./auth-modal";
import { GameFrame } from "./game-frame";
import { ResponsibleModal } from "./responsible-modal";
import { NotificationsBell } from "./notifications-bell";
import { HistoryModal } from "./history-modal";
import { session, usePlayerSession } from "@/lib/session-store";

const FIXED_CATEGORIES: { slug: string; name: string }[] = [
  { slug: "todos", name: "Todos" },
  { slug: "originals", name: "Originals" },
  { slug: "slots", name: "Slots" },
  { slug: "crash", name: "Crash" },
  { slug: "live", name: "En vivo" },
];

function formatFun(cents: number) {
  return new Intl.NumberFormat("es-ES").format(Math.floor(cents / 100));
}

// Píldora de saldo que destella (verde sube, rojo baja) cuando el WS empuja
// un saldo nuevo — feedback visual de que la actualización es en vivo.
function BalancePill({ cash }: { cash: number }) {
  const prev = useRef(cash);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);

  useEffect(() => {
    if (cash === prev.current) return;
    setFlash(cash > prev.current ? "up" : "down");
    prev.current = cash;
    const t = setTimeout(() => setFlash(null), 700);
    return () => clearTimeout(t);
  }, [cash]);

  const flashClass = flash === "up" ? "border-win/70 bg-win/20" : flash === "down" ? "border-danger/60 bg-danger/15" : "border-gold/35 bg-gold/10";

  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold text-gold-bright transition-colors duration-300 ${flashClass}`}
      title="Saldo en tiempo real"
    >
      <span className="h-1.5 w-1.5 rounded-full bg-win" aria-hidden />
      {formatFun(cash)} <span className="text-[0.65rem] font-bold">FUN</span>
    </div>
  );
}

export function Lobby() {
  const player = usePlayerSession();
  const [category, setCategory] = useState("todos");
  const [query, setQuery] = useState("");
  const [allGames, setAllGames] = useState<CatalogGame[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [info, setInfo] = useState<CatalogGame | null>(null);
  const [playing, setPlaying] = useState<CatalogGame | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [rgOpen, setRgOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);

  useEffect(() => {
    session.bootstrap();
    Promise.all([fetchCatalog(), fetchCategories()])
      .then(([games, cats]) => {
        setAllGames(games);
        setCategories(cats);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  const countByCat = useMemo(() => {
    const m: Record<string, number> = { todos: allGames.length };
    for (const c of categories) m[c.slug] = c.count;
    return m;
  }, [allGames, categories]);

  const games = useMemo(() => {
    const byCat =
      category === "todos" ? allGames : allGames.filter((g) => g.categories.includes(category));
    const q = query.trim().toLowerCase();
    return q ? byCat.filter((g) => g.name.toLowerCase().includes(q)) : byCat;
  }, [allGames, category, query]);

  const featured = useMemo(() => allGames.filter((g) => g.isFeatured), [allGames]);

  function onPlay(game: CatalogGame) {
    if (!game.playable) {
      setInfo(game);
      return;
    }
    if (!player.user) {
      setAuthOpen(true);
      return;
    }
    setPlaying(game);
  }

  return (
    <div className="min-h-dvh pb-16 md:pb-0">
      <header className="glass sticky top-0 z-40">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 md:px-6">
          <Link href="/" className="cursor-pointer" aria-label="Volver a la portada">
            <Logo compact />
          </Link>

          <div className="relative mx-auto w-full max-w-md">
            <svg viewBox="0 0 24 24" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-mute" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
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

          <div className="flex shrink-0 items-center gap-2">
            {player.user ? (
              <>
                <BalancePill cash={player.cash} />
                <NotificationsBell />
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="hidden cursor-pointer rounded-full border border-line px-3 py-2 text-sm text-ink-soft transition-colors duration-200 hover:border-gold/60 hover:text-ink sm:block"
                  title="Historial de movimientos"
                >
                  Historial
                </button>
                <button
                  type="button"
                  onClick={() => setRgOpen(true)}
                  className="hidden cursor-pointer rounded-full border border-line px-3 py-2 text-sm text-ink-soft transition-colors duration-200 hover:border-gold/60 hover:text-ink sm:block"
                  title="Juego responsable"
                >
                  Límites
                </button>
                <button
                  type="button"
                  onClick={() => session.logout()}
                  className="hidden cursor-pointer rounded-full border border-line px-4 py-2 text-sm text-ink-soft transition-colors duration-200 hover:border-gold/60 hover:text-ink md:block"
                  title={`Sesión de ${player.user.username}`}
                >
                  Salir
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setAuthOpen(true)}
                className="cursor-pointer rounded-full bg-gold px-4 py-2 text-sm font-bold text-night transition-colors duration-200 hover:bg-gold-bright"
              >
                Entrar
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-8 px-4 pt-6 md:px-6">
        <aside className="hidden w-44 shrink-0 lg:block" aria-label="Categorías">
          <nav className="sticky top-24 space-y-1">
            {FIXED_CATEGORIES.map((c) => {
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
                  <span className="float-right text-xs text-ink-mute">{countByCat[c.slug] ?? 0}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mb-5 flex gap-2 overflow-x-auto pb-1 lg:hidden" role="tablist" aria-label="Categorías">
            {FIXED_CATEGORIES.map((c) => {
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

          {player.ready && !player.user && (
            <div className="mb-6 rounded-xl border border-azure/30 bg-azure/5 px-4 py-3 text-sm text-ink-soft">
              Entra a tu cuenta para jugar. <strong className="text-azure">Capri Dice</strong> ya apuesta de verdad contra tu saldo.
            </div>
          )}
          {player.ready && player.user && player.cash === 0 && (
            <div className="mb-6 rounded-xl border border-gold/30 bg-gold/5 px-4 py-3 text-sm text-ink-soft">
              Tu saldo es 0 FUN. Pídele a tu operador que te cargue saldo para empezar a jugar.
            </div>
          )}

          {loadError ? (
            <p className="rounded-xl border border-danger/30 bg-danger/5 px-4 py-10 text-center text-sm text-ink-soft">
              No se pudo cargar el catálogo. ¿Está el servidor del casino en marcha?
            </p>
          ) : loading ? (
            <p className="px-4 py-16 text-center text-sm text-ink-mute">Cargando catálogo…</p>
          ) : (
            <>
              {category === "todos" && !query.trim() && featured.length > 0 && (
                <section className="mb-8" aria-label="Destacados">
                  <h2 className="font-display mb-3 text-xl font-semibold">Destacados</h2>
                  <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                    {featured.map((g) => (
                      <div key={g.id} className="w-32 shrink-0 snap-start md:w-40">
                        <GameCard game={g} onPlay={onPlay} />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              <section aria-label="Catálogo">
                <div className="mb-3 flex items-baseline justify-between">
                  <h2 className="font-display text-xl font-semibold">
                    {FIXED_CATEGORIES.find((c) => c.slug === category)?.name}
                  </h2>
                  <span className="text-xs text-ink-mute">
                    {games.length} {games.length === 1 ? "juego" : "juegos"}
                  </span>
                </div>

                {games.length === 0 ? (
                  <p className="rounded-xl border border-line bg-card px-4 py-10 text-center text-sm text-ink-mute">
                    {query.trim() ? `Sin resultados para «${query}».` : "No hay juegos en esta categoría."}
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 md:gap-4 xl:grid-cols-5">
                    {games.map((g) => (
                      <GameCard key={g.id} game={g} onPlay={onPlay} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          <p className="mt-10 border-t border-line pt-5 pb-8 text-center text-xs text-ink-mute">
            Catálogo servido por el operador · Capri Dice jugable · el resto llegará al integrar proveedores
          </p>
        </main>
      </div>

      <nav className="glass fixed inset-x-0 bottom-0 z-40 flex justify-around py-2.5 md:hidden" aria-label="Navegación móvil">
        <Link href="/" className="cursor-pointer px-4 py-1 text-xs font-medium text-ink-soft">Portada</Link>
        <button type="button" onClick={() => setCategory("originals")} className="cursor-pointer px-4 py-1 text-xs font-medium text-gold-bright">Originals</button>
        <button type="button" onClick={() => setCategory("slots")} className="cursor-pointer px-4 py-1 text-xs font-medium text-ink-soft">Slots</button>
        <Link href="/#promos" className="cursor-pointer px-4 py-1 text-xs font-medium text-ink-soft">Promos</Link>
      </nav>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {rgOpen && <ResponsibleModal onClose={() => setRgOpen(false)} />}
      {historyOpen && <HistoryModal onClose={() => setHistoryOpen(false)} />}
      {playing && <GameFrame game={playing} onClose={() => setPlaying(null)} />}

      {info && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-night/80 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={`Información de ${info.name}`}
          onClick={() => setInfo(null)}
        >
          <div className="glass w-full max-w-sm rounded-2xl p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-display text-2xl font-semibold text-gold-bright">{info.name}</h3>
            <p className="mt-3 text-sm leading-relaxed text-ink-soft">
              De <strong className="text-ink">{info.providerName}</strong>. Este juego estará disponible cuando se
              integre su proveedor. Hoy ya puedes jugar a Capri Dice de verdad contra tu saldo.
            </p>
            <button
              type="button"
              onClick={() => setInfo(null)}
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
