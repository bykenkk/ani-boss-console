import { coreRequest } from "@/api/request";
import { getAccessTokenJti, getAuthState } from "@/stores/auth";
import { normalizeAuthTokens } from "./tokens";
import type { AuthTokenResponse, AuthTokens, LogoutResponse, PlatformLoginInput } from "./types";

type LogoutRequest = { jti?: string };

export async function loginPlatform(input: PlatformLoginInput): Promise<AuthTokens> {
  // 新后端认证接口不接收幂等 key；刷新凭证仅通过 HttpOnly Cookie 下发。
  const response = await coreRequest<AuthTokenResponse, PlatformLoginInput>(
    "/auth/platform/password/login",
    {
      method: "POST",
      auth: "public",
      data: { username: input.username.trim(), password: input.password },
    },
  );
  return normalizeAuthTokens(response);
}

export function logoutPlatform(): Promise<LogoutResponse> {
  if (!getAuthState().tokens?.access_token) return Promise.resolve({ status: "local-only" });
  const jti = getAccessTokenJti();
  // jti 仅用于审计；缺失时仍需吊销服务端会话并清除 Cookie。
  return coreRequest<LogoutResponse, LogoutRequest>("/auth/logout", {
    method: "POST",
    data: jti ? { jti } : {},
  });
}

export type { AuthTokens, LogoutResponse, PlatformLoginInput } from "./types";
