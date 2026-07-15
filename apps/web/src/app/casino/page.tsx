import type { Metadata } from "next";
import { AppGate } from "@/components/app-gate";

export const metadata: Metadata = {
  title: "CAPRI CASINO",
  description: "Acceso privado para clientes de CAPRI.",
};

// Mismo portero que la portada (compatibilidad con enlaces antiguos a /casino).
export default function CasinoPage() {
  return <AppGate />;
}
