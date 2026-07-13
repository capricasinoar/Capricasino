// Catálogo mock del lobby demo. Cuando exista el módulo games (Semana 4),
// esto se sustituye por GET /api/v1/games — la forma imita GameSummary de @capri/contracts.

export type GameIconKey =
  | "dice"
  | "coin"
  | "mines"
  | "plinko"
  | "limbo"
  | "crash"
  | "slot"
  | "keno"
  | "roulette"
  | "blackjack"
  | "baccarat";

export interface MockGame {
  slug: string;
  name: string;
  provider: string;
  type: "original" | "slot" | "crash" | "live";
  rtp?: number;
  icon: GameIconKey;
  /* clases tailwind del degradado de la miniatura */
  gradient: string;
  featured?: boolean;
  badge?: "HOT" | "NUEVO" | "PRONTO";
}

export const GAMES: MockGame[] = [
  // ── Capri Originals (provably fair, provider-sim) ──
  { slug: "dice", name: "Capri Dice", provider: "Capri Originals", type: "original", rtp: 99, icon: "dice", gradient: "from-[#0f6a8b] to-[#082436]", featured: true, badge: "HOT" },
  { slug: "faraglioni", name: "Faraglioni Crash", provider: "Capri Originals", type: "crash", rtp: 97, icon: "crash", gradient: "from-[#7a2048] to-[#20081a]", featured: true, badge: "HOT" },
  { slug: "mines", name: "Mines", provider: "Capri Originals", type: "original", rtp: 97, icon: "mines", gradient: "from-[#3d3d0e] to-[#141405]", featured: true },
  { slug: "plinko", name: "Plinko", provider: "Capri Originals", type: "original", rtp: 97, icon: "plinko", gradient: "from-[#173a6b] to-[#080f22]", featured: true },
  { slug: "coinflip", name: "Coinflip", provider: "Capri Originals", type: "original", rtp: 98, icon: "coin", gradient: "from-[#8c6a12] to-[#2b1f04]", featured: true },
  { slug: "limbo", name: "Limbo", provider: "Capri Originals", type: "original", rtp: 99, icon: "limbo", gradient: "from-[#256356] to-[#07201a]", featured: true, badge: "NUEVO" },
  { slug: "capri-fruits", name: "Capri Fruits", provider: "Capri Originals", type: "slot", rtp: 96.5, icon: "slot", gradient: "from-[#71264d] to-[#1e0413]", featured: true },
  { slug: "keno", name: "Keno Azzurro", provider: "Capri Originals", type: "original", rtp: 96, icon: "keno", gradient: "from-[#155e75] to-[#041c24]", featured: true, badge: "NUEVO" },

  // ── Slots de la casa (mock hasta integrar catálogo real) ──
  { slug: "tesoro-azzurro", name: "Tesoro Azzurro", provider: "Capri Studios", type: "slot", rtp: 96.2, icon: "slot", gradient: "from-[#1d4ed8] to-[#0a1030]" },
  { slug: "gemas-del-vesubio", name: "Gemas del Vesubio", provider: "Capri Studios", type: "slot", rtp: 95.8, icon: "slot", gradient: "from-[#b91c1c] to-[#270606]", badge: "HOT" },
  { slug: "ruta-amalfitana", name: "Ruta Amalfitana", provider: "Capri Studios", type: "slot", rtp: 96.0, icon: "slot", gradient: "from-[#0e7490] to-[#03222c]" },
  { slug: "fortuna-di-capri", name: "Fortuna di Capri", provider: "Capri Studios", type: "slot", rtp: 96.7, icon: "slot", gradient: "from-[#a16207] to-[#241602]" },
  { slug: "limoncello-wild", name: "Limoncello Wild", provider: "Capri Studios", type: "slot", rtp: 95.5, icon: "slot", gradient: "from-[#4d7c0f] to-[#131f03]", badge: "NUEVO" },
  { slug: "sirena-gold", name: "Sirena's Gold", provider: "Capri Studios", type: "slot", rtp: 96.4, icon: "slot", gradient: "from-[#0f766e] to-[#032220]" },

  // ── En vivo (llegará con proveedores reales / demo en Semana 6) ──
  { slug: "ruleta-capri", name: "Ruleta Capri", provider: "Capri Live", type: "live", icon: "roulette", gradient: "from-[#3b0764] to-[#12021f]", badge: "PRONTO" },
  { slug: "blackjack-riviera", name: "Blackjack Riviera", provider: "Capri Live", type: "live", icon: "blackjack", gradient: "from-[#065f46] to-[#02201716]", badge: "PRONTO" },
  { slug: "baccarat-positano", name: "Baccarat Positano", provider: "Capri Live", type: "live", icon: "baccarat", gradient: "from-[#9d174d] to-[#2b0416]", badge: "PRONTO" },
];

export const CATEGORIES = [
  { slug: "todos", name: "Todos" },
  { slug: "originals", name: "Originals" },
  { slug: "slots", name: "Slots" },
  { slug: "crash", name: "Crash" },
  { slug: "live", name: "En vivo" },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]["slug"];

export function gamesByCategory(cat: CategorySlug): MockGame[] {
  if (cat === "todos") return GAMES;
  if (cat === "originals") return GAMES.filter((g) => g.type === "original");
  if (cat === "slots") return GAMES.filter((g) => g.type === "slot");
  if (cat === "crash") return GAMES.filter((g) => g.type === "crash");
  return GAMES.filter((g) => g.type === "live");
}
