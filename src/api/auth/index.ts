import {
  AUTH_APPLICATION,
  coreRequest,
  initializeCsrfToken,
  pauseSessionRefresh,
  resumeSessionRefresh,
} from "@/api/request";
import { clearAuthSession, getAccessTokenJti, setAuthSession } from "@/stores/auth";
import { normalizeAuthTokens } from "./tokens";
import type { AuthTokenResponse, AuthTokens, LogoutResponse, PlatformLoginInput } from "./types";

type LogoutRequest = { application: "boss"; jti?: string };

export async function loginPlatform(input: PlatformLoginInput): Promise<AuthTokens> {
  await pauseSessionRefresh();
  let sessionCreated = false;
  try {
    const response = await coreRequest<AuthTokenResponse, PlatformLoginInput>(
      "/auth/platform/password/login",
      {
        method: "POST",
        auth: "public",
        timeout: 15_000,
        data: { username: input.username.trim(), password: input.password },
      },
    );
    const tokens = normalizeAuthTokens(response);
    setAuthSession(tokens, input.username);
    sessionCreated = true;
    await initializeCsrfToken();
    return tokens;
  } catch (error) {
    if (sessionCreated) clearAuthSession();
    else resumeSessionRefresh();
    throw error;
  }
}

export async function logoutPlatform(): Promise<LogoutResponse> {
  const jti = getAccessTokenJti();
  await pauseSessionRefresh();
  try {
    const response = await coreRequest<LogoutResponse, LogoutRequest>("/auth/logout", {
      method: "POST",
      auth: "public",
      timeout: 15_000,
      data: { application: AUTH_APPLICATION, ...(jti ? { jti } : {}) },
    });
    clearAuthSession();
    return response;
  } catch (error) {
    resumeSessionRefresh();
    throw error;
  }
}

export type { AuthTokens, LogoutResponse, PlatformLoginInput } from "./types";
