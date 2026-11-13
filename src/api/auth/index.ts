import {
  AUTH_APPLICATION,
  authRequest,
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
    const response = await authRequest<AuthTokenResponse, PlatformLoginInput>(
      "/platform/password/login",
      {
        method: "POST",
        data: { username: input.username.trim(), password: input.password },
      },
    );
    const tokens = normalizeAuthTokens(response);
    setAuthSession(tokens);
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
    const response = await authRequest<LogoutResponse, LogoutRequest>("/logout", {
      method: "POST",
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

export { currentUserQueryKey, fetchCurrentUser } from "./profile";
export type { CurrentUser } from "./types";
