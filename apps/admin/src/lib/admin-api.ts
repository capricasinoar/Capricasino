"use client";

// Cliente del API admin. El token se guarda en sessionStorage (se pierde al
// cerrar la pestaña) — el panel es de uso puntual del operador.
// Base del API sin sufijo de versión: los endpoints admin cuelgan de /admin/v1.
// Tolera heredar NEXT_PUBLIC_API_URL con "/api/v1" (variable de la web).
const RAW = process.env.NEXT_PUBLIC_ADMIN_API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const API = RAW.replace(/\/api\/v1\/?$/, "");
const KEY = "capri_admin_token";

export function getToken() {
  return typeof window === "undefined" ? null : sessionStorage.getItem(KEY);
}
export function setToken(t: string | null) {
  if (typeof window === "undefined") return;
  if (t) sessionStorage.setItem(KEY, t);
  else sessionStorage.removeItem(KEY);
}

export class AdminApiError extends Error {
  constructor(readonly code: string, message: string, readonly status: number) {
    super(message);
  }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/admin/v1${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AdminApiError(body?.error?.code ?? "ERROR", body?.error?.message ?? `HTTP ${res.status}`, res.status);
  }
  return body as T;
}

export interface Dashboard {
  players: number;
  balanceInCirculation: number;
  ggr: number;
  totalBets: number;
  totalWins: number;
  deposits: number;
  withdrawals: number;
  openSessions: number;
  txLast24h: number;
}
export interface UserRow {
  id: string;
  email: string;
  username: string;
  status: string;
  vipLevel: number;
  cash: number;
  bonus: number;
  createdAt: string;
}
export interface LedgerLeg {
  account: string;
  direction: "debit" | "credit";
  amount: number;
}
export interface TxRow {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number | null;
  status: string;
  createdAt: string;
  ledger: LedgerLeg[];
}
export interface UserDetail extends UserRow {
  transactions: TxRow[];
  sessions: { id: string; game: string; status: string; startedAt: string }[];
}
export interface AuditRow {
  id: string;
  action: string;
  admin: string;
  targetType: string | null;
  targetId: string | null;
  before: unknown;
  after: unknown;
  createdAt: string;
}

export const adminApi = {
  login: (email: string, password: string) =>
    req<{ admin: { id: string; email: string; role: string }; accessToken: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => req<{ id: string; email: string; role: string }>("/me"),
  dashboard: () => req<Dashboard>("/dashboard"),
  users: (search?: string) => req<UserRow[]>(`/users${search ? `?search=${encodeURIComponent(search)}` : ""}`),
  user: (id: string) => req<UserDetail>(`/users/${id}`),
  adjust: (id: string, kind: "deposit" | "withdrawal", amount: number, reason: string) =>
    req<{ balanceBefore: number; balanceAfter: number }>(`/users/${id}/adjust`, {
      method: "POST",
      body: JSON.stringify({ kind, amount, reason }),
    }),
  auditLogs: () => req<AuditRow[]>("/audit-logs"),
};

export function fun(cents: number) {
  return new Intl.NumberFormat("es-ES", { minimumFractionDigits: 2 }).format(cents / 100) + " FUN";
}
