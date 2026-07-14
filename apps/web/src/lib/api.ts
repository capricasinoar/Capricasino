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
      "content-type": "application/json",
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
  register: (email: string, username: string, password: string) =>
    request<AuthResult>("/auth/register", { method: "POST", body: JSON.stringify({ email, username, password }) }),
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

  // Juego responsable (del propio jugador)
  rgStatus: () => request<RgStatus>("/responsible-gaming/status"),
  rgSetLimit: (kind: RgLimitKind, value: number) =>
    request<RgStatus>("/responsible-gaming/limits", { method: "PUT", body: JSON.stringify({ kind, value }) }),
  rgRemoveLimit: (kind: RgLimitKind) =>
    request<RgStatus>(`/responsible-gaming/limits/${kind}`, { method: "DELETE" }),
  rgSelfExclude: (days: number | null, reason?: string) =>
    request<{ ok: boolean }>("/responsible-gaming/self-exclude", { method: "POST", body: JSON.stringify({ days, reason }) }),
};

export type RgLimitKind = "daily_wager" | "daily_loss" | "session_reminder";
export interface RgStatus {
  limits: { kind: RgLimitKind; value: number }[];
  exclusion: { until: string | null; source: string } | null;
  wageredToday: number;
  netLossToday: number;
}
