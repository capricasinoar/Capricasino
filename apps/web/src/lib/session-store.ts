"use client";

// Sesión del jugador en el cliente: usuario + saldo, con refresh silencioso.
// Estado mínimo con un store propio (sin dependencias) — Zustand llega si crece.
import { useSyncExternalStore } from "react";
import { api, setAccessToken, getAccessToken, ApiError } from "./api";
import { connectRealtime, disconnectRealtime } from "./realtime";

export interface PlayerSession {
  user: { id: string; username: string; vipLevel: number } | null;
  cash: number;
  bonus: number;
  ready: boolean; // true tras el primer intento de refresh
}

let state: PlayerSession = { user: null, cash: 0, bonus: 0, ready: false };
const listeners = new Set<() => void>();

function set(patch: Partial<PlayerSession>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const session = {
  subscribe(cb: () => void) {
    listeners.add(cb);
    return () => listeners.delete(cb);
  },
  snapshot: () => state,

  async bootstrap() {
    try {
      const res = await api.refresh(); // usa la cookie httpOnly
      setAccessToken(res.accessToken);
      set({ user: res.user });
      await this.refreshBalance();
      this.openRealtime();
    } catch {
      setAccessToken(null);
      set({ user: null });
    } finally {
      set({ ready: true });
    }
  },

  async login(email: string, password: string) {
    const res = await api.login(email, password);
    setAccessToken(res.accessToken);
    set({ user: res.user });
    await this.refreshBalance();
    this.openRealtime();
  },

  async register(email: string, username: string, password: string) {
    const res = await api.register(email, username, password);
    setAccessToken(res.accessToken);
    set({ user: res.user });
    await this.refreshBalance();
    this.openRealtime();
  },

  async logout() {
    disconnectRealtime();
    await api.logout().catch(() => undefined);
    setAccessToken(null);
    set({ user: null, cash: 0, bonus: 0 });
  },

  // Abre el WebSocket: el saldo se actualizará solo tras cada apuesta/premio.
  openRealtime() {
    const token = getAccessToken();
    if (!token) return;
    connectRealtime(token, {
      onBalance: (b) => set({ cash: b.cash, bonus: b.bonus }),
      onReconnect: () => this.refreshBalance(), // resync por REST al reconectar
    });
  },

  async refreshBalance() {
    try {
      const b = await api.balance();
      set({ cash: b.cash, bonus: b.bonus });
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setAccessToken(null);
        set({ user: null });
      }
    }
  },
};

export function usePlayerSession(): PlayerSession {
  return useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
}
