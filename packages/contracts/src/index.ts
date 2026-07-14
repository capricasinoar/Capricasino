// @capri/contracts — fuente de verdad de los contratos de API (docs/architecture.md Cap. 7)
// Convención: montos SIEMPRE en unidad mínima de FUN (centavos ficticios), como entero.
import { z } from "zod";

// ── Auth (Cap. 7.1) ──────────────────────────────────────────────────

export const RegisterRequest = z.object({
  email: z.string().email(),
  username: z.string().min(3).max(24).regex(/^[a-zA-Z0-9_]+$/),
  password: z.string().min(8).max(128),
});
export type RegisterRequest = z.infer<typeof RegisterRequest>;

export const LoginRequest = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginRequest = z.infer<typeof LoginRequest>;

export const AuthResponse = z.object({
  user: z.object({
    id: z.string().uuid(),
    username: z.string(),
    vipLevel: z.number().int().min(0),
  }),
  accessToken: z.string(),
  expiresIn: z.number().int().positive(),
});
export type AuthResponse = z.infer<typeof AuthResponse>;

// ── Wallet (Cap. 7.2) ────────────────────────────────────────────────

export const BalanceResponse = z.object({
  cash: z.number().int().nonnegative(),
  bonus: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  currency: z.literal("FUN"),
});
export type BalanceResponse = z.infer<typeof BalanceResponse>;

// ── Juegos (Cap. 7.4) ────────────────────────────────────────────────

export const GameType = z.enum(["slot", "live", "crash", "table", "instant", "original"]);
export type GameType = z.infer<typeof GameType>;

export const Volatility = z.enum(["low", "medium", "high"]);
export type Volatility = z.infer<typeof Volatility>;

// Forma del catálogo pensada para ser AGNÓSTICA al proveedor: son los mismos
// campos que entregaría un agregador (Realist, Hub88, SoftSwiss). El día de la
// licencia, importar su catálogo es un seed con esta forma — no un rediseño.
export const GameSummary = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  provider: z.string(), // código técnico del proveedor: 'sim', 'capri-studios'...
  providerName: z.string(), // nombre para mostrar
  type: GameType,
  rtp: z.number().nullable().optional(),
  volatility: Volatility.nullable().optional(),
  thumbnail: z.string().nullable().optional(),
  categories: z.array(z.string()).default([]),
  isFeatured: z.boolean().default(false),
  // true si tenemos un adapter registrado para su proveedor (hoy: solo 'sim').
  // Un agregador real pondría en true todo su catálogo al enchufarse.
  playable: z.boolean(),
});
export type GameSummary = z.infer<typeof GameSummary>;

export const GameCatalogResponse = z.object({
  items: z.array(GameSummary),
  nextCursor: z.string().nullable(),
});
export type GameCatalogResponse = z.infer<typeof GameCatalogResponse>;

export const CategorySummary = z.object({
  slug: z.string(),
  name: z.string(),
  count: z.number().int().nonnegative(),
});
export type CategorySummary = z.infer<typeof CategorySummary>;

export const LaunchGameRequest = z.object({ gameId: z.string() });
export const LaunchGameResponse = z.object({
  gameUrl: z.string().url(),
  sessionId: z.string(),
  launchToken: z.string(),
});

// ── Callback del proveedor (Cap. 7.5, server-to-server, firmado HMAC) ─
// El HTTP status es 200 incluso en errores de negocio; el error va en `status`.

export const ProviderCallbackStatus = z.enum([
  "OK",
  "INSUFFICIENT_FUNDS",
  "INVALID_TOKEN",
  "TRANSACTION_NOT_FOUND",
  "INTERNAL_ERROR",
]);
export type ProviderCallbackStatus = z.infer<typeof ProviderCallbackStatus>;

const callbackBase = {
  token: z.string(), // launch_token de la game_session
  timestamp: z.number().int(),
  hash: z.string(), // HMAC-SHA256 — verificar con timingSafeEqual ANTES de procesar
};

export const ProviderCallback = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("balance"),
    ...callbackBase,
  }),
  z.object({
    action: z.literal("bet"),
    amount: z.number().int().positive(),
    roundId: z.string(),
    transactionId: z.string(), // ← ID ÚNICO: clave de idempotencia
    gameCode: z.string(),
    ...callbackBase,
  }),
  z.object({
    action: z.literal("win"),
    amount: z.number().int().nonnegative(),
    roundId: z.string(),
    transactionId: z.string(),
    ...callbackBase,
  }),
  z.object({
    action: z.literal("rollback"),
    referenceTransactionId: z.string(),
    transactionId: z.string(),
    ...callbackBase,
  }),
]);
export type ProviderCallback = z.infer<typeof ProviderCallback>;

export const ProviderCallbackResponse = z.object({
  status: ProviderCallbackStatus,
  balance: z.number().int().nonnegative().optional(),
  transactionId: z.string().optional(),
  currency: z.literal("FUN").optional(),
});
export type ProviderCallbackResponse = z.infer<typeof ProviderCallbackResponse>;

// ── Error estándar de API ────────────────────────────────────────────

export const ApiError = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;
