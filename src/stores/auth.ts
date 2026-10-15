import { createStore } from "zustand/vanilla";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import type { AuthTokens } from "@/api/auth/types";

interface AuthState {
  tokens: AuthTokens | null;
}

const EMPTY_STATE: AuthState = {
  tokens: null,
};

const authStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      // 存储不可用时，当前页面仍可使用内存中的登录态。
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch {
      // 本地存储不可用不影响清空内存登录态。
    }
  },
};

export const authStore = createStore<AuthState>()(
  persist(() => EMPTY_STATE, {
    name: "ani-boss-auth",
    storage: createJSONStorage(() => authStorage),
    partialize: (state) => ({
      tokens: state.tokens,
    }),
  }),
);

export function getAuthState() {
  return authStore.getState();
}

export function setAuthSession(tokens: AuthTokens) {
  authStore.setState({ tokens });
}

export function updateAccessToken(tokens: AuthTokens) {
  authStore.setState({ tokens });
}

export function clearAuthSession() {
  authStore.setState(EMPTY_STATE, true);
}

export function isAuthenticated() {
  return Boolean(authStore.getState().tokens?.access_token);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAccessTokenJti() {
  const token = authStore.getState().tokens?.access_token;
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return typeof payload?.jti === "string" && payload.jti ? payload.jti : null;
}

export function getAccessTokenRoles(accessToken = authStore.getState().tokens?.access_token) {
  if (!accessToken) return [];
  const payload = decodeJwtPayload(accessToken);
  const roles = payload?.roles;
  return Array.isArray(roles)
    ? roles.filter((role): role is string => typeof role === "string")
    : [];
}
