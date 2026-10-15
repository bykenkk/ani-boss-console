import { createStore } from "zustand/vanilla";
import type { AuthTokens } from "@/api/auth/types";

interface AuthState {
  tokens: AuthTokens | null;
  username: string;
  accessTokenExpiresAt: number | null;
}

const STORAGE_KEY = "ani-platform-console-auth";
const EMPTY_STATE: AuthState = {
  tokens: null,
  username: "",
  accessTokenExpiresAt: null,
};

function readStoredState(): AuthState {
  if (typeof window === "undefined") return EMPTY_STATE;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const stored = JSON.parse(raw) as { username?: unknown };
    return {
      ...EMPTY_STATE,
      username: typeof stored?.username === "string" ? stored.username.trim() : "",
    };
  } catch {
    return EMPTY_STATE;
  }
}

export const authStore = createStore<AuthState>()(readStoredState);

function persistAuthMetadata(state: AuthState): void {
  if (typeof window === "undefined") return;
  try {
    if (state === EMPTY_STATE) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ username: state.username }));
  } catch {
    // 浏览器禁止存储时，当前页面的内存会话仍可正常登录、刷新和退出。
  }
}

authStore.subscribe(persistAuthMetadata);
persistAuthMetadata(authStore.getState());

let sessionRevision = 0;

export function getAuthSessionRevision() {
  return sessionRevision;
}

export function getAuthState() {
  return authStore.getState();
}

export function setAuthSession(tokens: AuthTokens, username: string) {
  sessionRevision += 1;
  authStore.setState({
    tokens,
    username: username.trim(),
    accessTokenExpiresAt: getAccessTokenExpiry(tokens.expires_in),
  });
}

export function updateAccessToken(tokens: AuthTokens) {
  authStore.setState({
    tokens,
    accessTokenExpiresAt: getAccessTokenExpiry(tokens.expires_in),
  });
}

function getAccessTokenExpiry(expiresIn?: number): number | null {
  return typeof expiresIn === "number" && Number.isFinite(expiresIn) && expiresIn > 0
    ? Date.now() + expiresIn * 1000
    : null;
}

export function clearAuthSession() {
  sessionRevision += 1;
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
