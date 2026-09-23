import { createStore } from "zustand/vanilla";
import type { AuthTokens } from "@/api/auth/types";

interface AuthState {
  tokens: AuthTokens | null;
  username: string;
  developmentBypass: boolean;
}

const STORAGE_KEY = "ani-platform-console-auth";
const EMPTY_STATE: AuthState = {
  tokens: null,
  username: "",
  developmentBypass: false,
};

function readStoredState(): AuthState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const stored = JSON.parse(raw) as Partial<AuthState>;
    const tokens = stored.tokens;
    return {
      tokens:
        tokens?.access_token && tokens.refresh_token
          ? {
              access_token: tokens.access_token,
              refresh_token: tokens.refresh_token,
              expires_in: tokens.expires_in,
              issued_at: tokens.issued_at,
            }
          : null,
      username: typeof stored.username === "string" ? stored.username : "",
      developmentBypass: import.meta.env.DEV && stored.developmentBypass === true,
    };
  } catch {
    return EMPTY_STATE;
  }
}

export const authStore = createStore<AuthState>()(readStoredState);

authStore.subscribe((state) => {
  // 清空会话由 clearAuthSession 删除缓存，不再写回空状态。
  if (typeof window === "undefined" || state === EMPTY_STATE) return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
});

export function getAuthState() {
  return authStore.getState();
}

export function setAuthSession(tokens: AuthTokens, username: string) {
  authStore.setState({
    tokens,
    username: username.trim(),
    developmentBypass: false,
  });
}

export function updateAccessToken(accessToken: string, expiresIn?: number) {
  const state = authStore.getState();
  if (!state.tokens) return;
  authStore.setState({
    tokens: {
      ...state.tokens,
      access_token: accessToken,
      expires_in: expiresIn,
    },
  });
}

export function setDevelopmentAuthBypass(enabled: boolean) {
  authStore.setState({
    developmentBypass: import.meta.env.DEV && enabled,
  });
}

export function clearAuthSession() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
  authStore.setState(EMPTY_STATE, true);
}

export function isDevelopmentAuthBypassActive() {
  return import.meta.env.DEV && authStore.getState().developmentBypass;
}

export function isAuthenticated() {
  return Boolean(authStore.getState().tokens?.access_token) || isDevelopmentAuthBypassActive();
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
