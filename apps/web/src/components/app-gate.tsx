"use client";

// Portero de la web privada: la primera pantalla es el login. Solo tras iniciar
// sesión se muestra el lobby. Si la sesión sigue viva (cookie), entra directo.
import { useEffect } from "react";
import { session, usePlayerSession } from "@/lib/session-store";
import { LoginScreen } from "./login-screen";
import { Lobby } from "./lobby";

export function AppGate() {
  const player = usePlayerSession();

  useEffect(() => {
    session.bootstrap();
  }, []);

  if (!player.ready) {
    return <div className="grid min-h-dvh place-items-center text-sm text-ink-mute">Cargando…</div>;
  }
  return player.user ? <Lobby /> : <LoginScreen />;
}
