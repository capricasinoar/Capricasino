import type { Metadata } from "next";
import { Lobby } from "@/components/lobby";

export const metadata: Metadata = {
  title: "Lobby — CAPRI CASINO",
  description: "Catálogo de juegos de CAPRI CASINO: originals provably fair, slots y crash. 100% play money.",
};

export default function CasinoPage() {
  return <Lobby />;
}
