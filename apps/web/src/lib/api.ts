// Cliente del API del casino. El access token vive en memoria (Cap. 8.1);
// el refresh token es una cookie httpOnly que el navegador envía solo.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

let accessToken: string | null = null;
export function setAccessToken(t: string | null) {
  accessToken = t;
}
export function getAccessToken() {
  return accessToken;
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    credentials: "include",
    headers: {
      // content-type solo si hay cuerpo: Fastify rechaza un body JSON vacío
      // (afecta a POST sin body como refresh/logout).
      ...(opts.body ? { "content-type": "application/json" } : {}),
      ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}),
      ...opts.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const code = body?.error?.code ?? "ERROR";
    const message = body?.error?.message ?? `HTTP ${res.status}`;
    throw new ApiError(code, message, res.status);
  }
  return body as T;
}

export class ApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
  }
}

export interface AuthResult {
  user: { id: string; username: string; vipLevel: number };
  accessToken: string;
  expiresIn: number;
}

export const api = {
  // Web privada: sin registro público. Solo el operador crea cuentas.
  login: (email: string, password: string) =>
    request<AuthResult>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  refresh: () => request<AuthResult>("/auth/refresh", { method: "POST" }),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  balance: () => request<{ cash: number; bonus: number; total: number; currency: string }>("/wallet/balance"),
  launch: (gameId: string) =>
    request<{ gameUrl: string; sessionId: string; launchToken: string }>("/games/launch", {
      method: "POST",
      body: JSON.stringify({ gameId }),
    }),

  // Historial de movimientos (group: "money" | "game" | undefined=todos)
  transactions: (group?: "money" | "game", cursor?: string) => {
    const qs = new URLSearchParams();
    if (group) qs.set("group", group);
    if (cursor) qs.set("cursor", cursor);
    const q = qs.toString();
    return request<TxPage>(`/wallet/transactions${q ? `?${q}` : ""}`);
  },

  // Notificaciones
  notifications: (cursor?: string) =>
    request<NotificationsPage>(`/notifications${cursor ? `?cursor=${cursor}` : ""}`),
  markNotificationsRead: (ids: string[]) =>
    request<{ unread: number }>("/notifications/read", { method: "POST", body: JSON.stringify({ ids }) }),
  markAllNotificationsRead: () => request<{ unread: number }>("/notifications/read-all", { method: "POST" }),

  // Juego responsable (del propio jugador)
  rgStatus: () => request<RgStatus>("/responsible-gaming/status"),
  rgSetLimit: (kind: RgLimitKind, value: number) =>
    request<RgStatus>("/responsible-gaming/limits", { method: "PUT", body: JSON.stringify({ kind, value }) }),
  rgRemoveLimit: (kind: RgLimitKind) =>
    request<RgStatus>(`/responsible-gaming/limits/${kind}`, { method: "DELETE" }),
  rgSelfExclude: (days: number | null, reason?: string) =>
    request<{ ok: boolean }>("/responsible-gaming/self-exclude", { method: "POST", body: JSON.stringify({ days, reason }) }),
};

export interface TxRow {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number | null;
  status: string;
  createdAt: string;
}
export interface TxPage {
  items: TxRow[];
  nextCursor: string | null;
}
export interface NotificationRow {
  id: string;
  type: string;
  payload: { amount?: number; reason?: string | null; balanceAfter?: number; until?: string | null } | null;
  read: boolean;
  createdAt: string;
}
export interface NotificationsPage {
  items: NotificationRow[];
  nextCursor: string | null;
  unread: number;
}

export type RgLimitKind = "daily_wager" | "daily_loss" | "session_reminder";
export interface RgStatus {
  limits: { kind: RgLimitKind; value: number }[];
  exclusion: { until: string | null; source: string } | null;
  wageredToday: number;
  netLossToday: number;
}
