import { createStore } from "zustand/vanilla";
import type { AuthTokens } from "@/api/auth/types";

interface AuthState {
  tokens: AuthTokens | null;
  accessTokenExpiresAt: number | null;
}

const EMPTY_STATE: AuthState = {
  tokens: null,
  accessTokenExpiresAt: null,
};

export const authStore = createStore<AuthState>()(() => EMPTY_STATE);

let sessionRevision = 0;

export function getAuthSessionRevision() {
  return sessionRevision;
}

export function getAuthState() {
  return authStore.getState();
}

export function setAuthSession(tokens: AuthTokens) {
  sessionRevision += 1;
  authStore.setState({
    tokens,
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
