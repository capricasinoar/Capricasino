import { AppGate } from "@/components/app-gate";

// Web privada: la portada es el acceso. Tras iniciar sesión, el lobby.
export default function Home() {
  return <AppGate />;
}
