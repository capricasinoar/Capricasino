// Seed del catálogo. Forma agnóstica al proveedor: cada juego pertenece a un
// proveedor y a categorías, igual que lo entregaría un agregador. Hoy solo el
// proveedor 'sim' tiene adapter (Capri Dice jugable); el resto son catálogo
// que se vuelve jugable el día que se enchufe un proveedor/agregador real.
//   pnpm db:seed
import { PrismaClient, type GameType, type Volatility } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

type Row = {
  code: string;
  name: string;
  slug: string;
  type: GameType;
  rtp?: number;
  volatility?: Volatility;
  featured?: boolean;
  categories: string[];
  sort: number;
};

async function main() {
  // ── Proveedores ──────────────────────────────────────────────────
  const sim = await prisma.provider.upsert({
    where: { code: "sim" },
    update: { name: "Capri Originals" },
    create: { code: "sim", name: "Capri Originals", type: "simulated" },
  });
  const studios = await prisma.provider.upsert({
    where: { code: "capri-studios" },
    update: {},
    create: { code: "capri-studios", name: "Capri Studios", type: "direct" },
  });
  const live = await prisma.provider.upsert({
    where: { code: "capri-live" },
    update: {},
    create: { code: "capri-live", name: "Capri Live", type: "direct" },
  });
  // Proveedor interno para operaciones manuales (cargas/retiradas)
  await prisma.provider.upsert({
    where: { code: "house" },
    update: {},
    create: { code: "house", name: "Capri House (operaciones manuales)", type: "direct" },
  });

  // ── Categorías ───────────────────────────────────────────────────
  const catDefs = [
    ["originals", "Originals"],
    ["slots", "Slots"],
    ["crash", "Crash"],
    ["live", "En vivo"],
    ["nuevos", "Nuevos"],
    ["populares", "Populares"],
  ];
  const catId: Record<string, string> = {};
  for (const [slug, name] of catDefs) {
    const c = await prisma.category.upsert({ where: { slug }, update: { name }, create: { slug, name } });
    catId[slug] = c.id;
  }

  // ── Catálogo (mismo que muestra el lobby) ────────────────────────
  const catalog: { providerId: string; rows: Row[] }[] = [
    {
      providerId: sim.id, // JUGABLE hoy (tiene adapter)
      rows: [
        { code: "dice", name: "Capri Dice", slug: "dice", type: "original", rtp: 99, volatility: "medium", featured: true, categories: ["originals", "populares"], sort: 1 },
      ],
    },
    {
      providerId: studios.id, // catálogo (aún sin adapter)
      rows: [
        { code: "tesoro-azzurro", name: "Tesoro Azzurro", slug: "tesoro-azzurro", type: "slot", rtp: 96.2, volatility: "medium", featured: true, categories: ["slots", "populares"], sort: 10 },
        { code: "gemas-del-vesubio", name: "Gemas del Vesubio", slug: "gemas-del-vesubio", type: "slot", rtp: 95.8, volatility: "high", categories: ["slots"], sort: 11 },
        { code: "ruta-amalfitana", name: "Ruta Amalfitana", slug: "ruta-amalfitana", type: "slot", rtp: 96.0, volatility: "medium", categories: ["slots"], sort: 12 },
        { code: "fortuna-di-capri", name: "Fortuna di Capri", slug: "fortuna-di-capri", type: "slot", rtp: 96.7, volatility: "low", featured: true, categories: ["slots"], sort: 13 },
        { code: "limoncello-wild", name: "Limoncello Wild", slug: "limoncello-wild", type: "slot", rtp: 95.5, volatility: "high", categories: ["slots", "nuevos"], sort: 14 },
        { code: "sirena-gold", name: "Sirena's Gold", slug: "sirena-gold", type: "slot", rtp: 96.4, volatility: "medium", categories: ["slots"], sort: 15 },
        { code: "faraglioni-crash", name: "Faraglioni Crash", slug: "faraglioni-crash", type: "crash", rtp: 97, volatility: "high", featured: true, categories: ["crash", "nuevos"], sort: 20 },
      ],
    },
    {
      providerId: live.id, // catálogo en vivo (aún sin adapter)
      rows: [
        { code: "ruleta-capri", name: "Ruleta Capri", slug: "ruleta-capri", type: "live", categories: ["live"], sort: 30 },
        { code: "blackjack-riviera", name: "Blackjack Riviera", slug: "blackjack-riviera", type: "live", categories: ["live"], sort: 31 },
        { code: "baccarat-positano", name: "Baccarat Positano", slug: "baccarat-positano", type: "live", categories: ["live"], sort: 32 },
      ],
    },
  ];

  for (const group of catalog) {
    for (const r of group.rows) {
      const game = await prisma.game.upsert({
        where: { slug: r.slug },
        update: {
          name: r.name,
          type: r.type,
          rtp: r.rtp,
          volatility: r.volatility,
          isFeatured: r.featured ?? false,
          sortOrder: r.sort,
          providerId: group.providerId,
        },
        create: {
          providerId: group.providerId,
          code: r.code,
          name: r.name,
          slug: r.slug,
          type: r.type,
          rtp: r.rtp,
          volatility: r.volatility,
          isFeatured: r.featured ?? false,
          sortOrder: r.sort,
        },
      });
      // Enlaces de categoría (idempotente)
      for (const cat of r.categories) {
        await prisma.gameCategory.upsert({
          where: { gameId_categoryId: { gameId: game.id, categoryId: catId[cat] } },
          update: {},
          create: { gameId: game.id, categoryId: catId[cat] },
        });
      }
    }
  }

  // ── Limpieza: quitar juegos de seeds anteriores que ya no están en el
  //    catálogo (evita que aparezcan como jugables y fallen al lanzar) ──
  const validSlugs = catalog.flatMap((g) => g.rows.map((r) => r.slug));
  const orphans = await prisma.game.findMany({
    where: { slug: { notIn: validSlugs } },
    select: { id: true, slug: true },
  });
  for (const o of orphans) {
    const sessions = await prisma.gameSession.count({ where: { gameId: o.id } });
    if (sessions > 0) continue; // no borrar juegos con sesiones (histórico)
    await prisma.gameCategory.deleteMany({ where: { gameId: o.id } });
    await prisma.game.delete({ where: { id: o.id } });
  }

  // ── Admin del operador (para el panel) ───────────────────────────
  const adminEmail = process.env.ADMIN_EMAIL ?? "owner@capri.local";
  const adminPass = process.env.ADMIN_PASSWORD ?? "capri-admin-2026";
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      passwordHash: await argon2.hash(adminPass, { type: argon2.argon2id }),
      role: "super_admin",
    },
  });

  const total = await prisma.game.count();
  console.log(`Seed completado: 3 proveedores, ${catDefs.length} categorías, ${total} juegos (Capri Dice jugable).`);
  console.log(`Admin: ${adminEmail} / ${adminPass}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
