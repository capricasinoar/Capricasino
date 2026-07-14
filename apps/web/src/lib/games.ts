// Lista estática de destacados SOLO para la landing (marketing, SSR, sin llamar
// a la API). El lobby real usa el catálogo servido por el backend (catalog.ts).
// Se mantiene en la forma CatalogGame para reutilizar GameCard.
import type { CatalogGame } from "./catalog";

export const LANDING_FEATURED: CatalogGame[] = [
  { id: "l-dice", name: "Capri Dice", slug: "dice", provider: "sim", providerName: "Capri Originals", type: "original", rtp: 99, categories: ["originals"], isFeatured: true, playable: true },
  { id: "l-faraglioni", name: "Faraglioni Crash", slug: "faraglioni-crash", provider: "capri-studios", providerName: "Capri Studios", type: "crash", rtp: 97, categories: ["crash"], isFeatured: true, playable: false },
  { id: "l-tesoro", name: "Tesoro Azzurro", slug: "tesoro-azzurro", provider: "capri-studios", providerName: "Capri Studios", type: "slot", rtp: 96.2, categories: ["slots"], isFeatured: true, playable: false },
  { id: "l-fortuna", name: "Fortuna di Capri", slug: "fortuna-di-capri", provider: "capri-studios", providerName: "Capri Studios", type: "slot", rtp: 96.7, categories: ["slots"], isFeatured: true, playable: false },
  { id: "l-ruleta", name: "Ruleta Capri", slug: "ruleta-capri", provider: "capri-live", providerName: "Capri Live", type: "live", categories: ["live"], isFeatured: false, playable: false },
  { id: "l-sirena", name: "Sirena's Gold", slug: "sirena-gold", provider: "capri-studios", providerName: "Capri Studios", type: "slot", rtp: 96.4, categories: ["slots"], isFeatured: false, playable: false },
  { id: "l-limoncello", name: "Limoncello Wild", slug: "limoncello-wild", provider: "capri-studios", providerName: "Capri Studios", type: "slot", rtp: 95.5, categories: ["slots"], isFeatured: false, playable: false },
  { id: "l-blackjack", name: "Blackjack Riviera", slug: "blackjack-riviera", provider: "capri-live", providerName: "Capri Live", type: "live", categories: ["live"], isFeatured: false, playable: false },
];
