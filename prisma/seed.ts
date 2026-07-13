// Seed de demo: proveedor simulado, categorías y catálogo inicial de Capri Originals.
// Se ejecuta con la DB levantada (docker compose) cuando el api integre Prisma (Semana 2+):
//   pnpm dlx tsx prisma/seed.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const sim = await prisma.provider.upsert({
    where: { code: "sim" },
    update: {},
    create: { code: "sim", name: "Capri Provider Sim", type: "simulated" },
  });

  const categories = ["originals", "slots", "crash", "live", "nuevos", "populares"];
  for (const slug of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { slug, name: slug[0].toUpperCase() + slug.slice(1) },
    });
  }

  const originals: Array<[string, string, "original" | "crash" | "slot", number]> = [
    ["dice", "Capri Dice", "original", 99],
    ["coinflip", "Coinflip", "original", 98],
    ["mines", "Mines", "original", 97],
    ["plinko", "Plinko", "original", 97],
    ["limbo", "Limbo", "original", 99],
    ["faraglioni", "Faraglioni Crash", "crash", 97],
    ["capri-fruits", "Capri Fruits", "slot", 96.5],
  ];

  for (const [code, name, type, rtp] of originals) {
    await prisma.game.upsert({
      where: { slug: code },
      update: {},
      create: {
        providerId: sim.id,
        code,
        name,
        slug: code,
        type,
        rtp,
        volatility: "medium",
        isFeatured: true,
      },
    });
  }

  console.log("Seed completado: provider sim + categorías + Capri Originals");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
