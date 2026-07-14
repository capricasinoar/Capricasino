// Catálogo servido por la API (agnóstico al proveedor). La lista y sus datos
// vienen del backend; el look (icono + gradiente) se decide aquí en el cliente,
// porque nuestros originals usan iconos SVG (un agregador real traería thumbnails).
import type { GameIconKey } from "@/components/game-icons";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

export interface CatalogGame {
  id: string;
  name: string;
  slug: string;
  provider: string;
  providerName: string;
  type: "slot" | "live" | "crash" | "table" | "instant" | "original";
  rtp?: number | null;
  volatility?: "low" | "medium" | "high" | null;
  thumbnail?: string | null;
  categories: string[];
  isFeatured: boolean;
  playable: boolean;
}

export interface Category {
  slug: string;
  name: string;
  count: number;
}

// Presentación: icono por slug conocido, con fallback por tipo.
const ICON_BY_SLUG: Record<string, GameIconKey> = {
  dice: "dice",
  "faraglioni-crash": "crash",
  "capri-fruits": "slot",
  "ruleta-capri": "roulette",
  "blackjack-riviera": "blackjack",
  "baccarat-positano": "baccarat",
};
const ICON_BY_TYPE: Record<CatalogGame["type"], GameIconKey> = {
  slot: "slot",
  crash: "crash",
  live: "roulette",
  table: "blackjack",
  instant: "dice",
  original: "dice",
};

// Gradiente por slug (para que cada tarjeta tenga su color); fallback por tipo.
const GRADIENT_BY_SLUG: Record<string, string> = {
  dice: "from-[#0f6a8b] to-[#082436]",
  "faraglioni-crash": "from-[#7a2048] to-[#20081a]",
  "tesoro-azzurro": "from-[#1d4ed8] to-[#0a1030]",
  "gemas-del-vesubio": "from-[#b91c1c] to-[#270606]",
  "ruta-amalfitana": "from-[#0e7490] to-[#03222c]",
  "fortuna-di-capri": "from-[#a16207] to-[#241602]",
  "limoncello-wild": "from-[#4d7c0f] to-[#131f03]",
  "sirena-gold": "from-[#0f766e] to-[#032220]",
  "ruleta-capri": "from-[#3b0764] to-[#12021f]",
  "blackjack-riviera": "from-[#065f46] to-[#022017]",
  "baccarat-positano": "from-[#9d174d] to-[#2b0416]",
};
const GRADIENT_BY_TYPE: Record<CatalogGame["type"], string> = {
  slot: "from-[#1d4ed8] to-[#0a1030]",
  crash: "from-[#7a2048] to-[#20081a]",
  live: "from-[#3b0764] to-[#12021f]",
  table: "from-[#065f46] to-[#022017]",
  instant: "from-[#0f6a8b] to-[#082436]",
  original: "from-[#0f6a8b] to-[#082436]",
};

export function iconFor(g: CatalogGame): GameIconKey {
  return ICON_BY_SLUG[g.slug] ?? ICON_BY_TYPE[g.type];
}
export function gradientFor(g: CatalogGame): string {
  return GRADIENT_BY_SLUG[g.slug] ?? GRADIENT_BY_TYPE[g.type];
}

export async function fetchCatalog(category?: string): Promise<CatalogGame[]> {
  const q = category && category !== "todos" ? `?category=${encodeURIComponent(category)}` : "";
  const res = await fetch(`${API_URL}/games${q}`);
  if (!res.ok) throw new Error(`catálogo HTTP ${res.status}`);
  const body = (await res.json()) as { items: CatalogGame[] };
  return body.items;
}

export async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(`${API_URL}/games/categories`);
  if (!res.ok) throw new Error(`categorías HTTP ${res.status}`);
  return (await res.json()) as Category[];
}
