// Tests del cálculo de nivel VIP (sin DB: usa statusFromWagered).
import { describe, expect, it } from "vitest";
import { VipService } from "./vip.service";

const vip = new VipService(null as never);

describe("VIP (niveles según lo apostado)", () => {
  it("sin apostar → Marina (nivel 0), progreso hacia Anacapri", () => {
    const s = vip.statusFromWagered(0);
    expect(s.level).toBe(0);
    expect(s.tier).toBe("Marina");
    expect(s.nextTier).toBe("Anacapri");
    expect(s.progressPct).toBe(0);
    expect(s.wageredToNext).toBe(500_000);
  });

  it("a mitad de camino de Anacapri (2.500 USD apostados) → 50% de progreso", () => {
    const s = vip.statusFromWagered(250_000);
    expect(s.level).toBe(0);
    expect(s.progressPct).toBe(50);
    expect(s.wageredToNext).toBe(250_000);
  });

  it("justo en el umbral de Anacapri (5.000 USD) → sube a nivel 1 con cashback 5%", () => {
    const s = vip.statusFromWagered(500_000);
    expect(s.level).toBe(1);
    expect(s.tier).toBe("Anacapri");
    expect(s.cashbackPct).toBe(5);
    expect(s.nextTier).toBe("Faraglioni");
  });

  it("Faraglioni (50.000 USD) → nivel 2, cashback 10%", () => {
    const s = vip.statusFromWagered(5_000_000);
    expect(s.level).toBe(2);
    expect(s.cashbackPct).toBe(10);
  });

  it("Grotta Azzurra (250.000 USD) → nivel máximo, sin siguiente, progreso 100%", () => {
    const s = vip.statusFromWagered(25_000_000);
    expect(s.level).toBe(3);
    expect(s.tier).toBe("Grotta Azzurra");
    expect(s.cashbackPct).toBe(15);
    expect(s.nextTier).toBeNull();
    expect(s.wageredToNext).toBe(0);
    expect(s.progressPct).toBe(100);
  });
});
