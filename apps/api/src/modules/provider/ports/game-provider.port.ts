// Puerto del proveedor de juegos (🧩 COSTURA-REAL #3, Cap. 4.4).
// Hoy lo implementa SimProviderAdapter (provider-sim); mañana Hub88Adapter/
// SlotegratorAdapter implementarían esta MISMA interfaz sin tocar el resto.

export interface LaunchParams {
  gameCode: string;
  playerToken: string; // launch_token de la game_session; vuelve en cada callback
  currency: "USD";
  language: string;
}

export interface LaunchResult {
  gameUrl: string; // URL que el frontend abre en un iframe
}

export interface GameProviderPort {
  readonly code: string; // 'sim' | 'pragmatic' | ...
  launch(params: LaunchParams): Promise<LaunchResult>;
}
