import { runIdempotentRequest } from "@/api/idempotency";
import { coreRequest } from "@/api/request";
import { getAccessTokenJti } from "@/stores/auth";
import { createIdempotencyScope } from "@/lib/idempotency";
import type { AuthTokens, LogoutResponse, PlatformLoginInput } from "./types";

type PlatformLoginRequest = PlatformLoginInput & { idempotency_key: string };
type LogoutRequest = { jti: string; idempotency_key: string };

const loginScope = createIdempotencyScope("platform-login", ["POST"]);
const logoutScope = createIdempotencyScope("platform-logout", ["POST"]);

export async function loginPlatform(input: PlatformLoginInput): Promise<AuthTokens> {
  const submitData = {
    username: input.username.trim(),
    password: input.password,
  };
  const tokens = await runIdempotentRequest(loginScope, submitData, (data: PlatformLoginRequest) =>
    coreRequest<AuthTokens, PlatformLoginRequest>("/auth/platform/password/login", {
      method: "POST",
      auth: "public",
      data,
    }),
  );
  if (!tokens?.access_token || !tokens.refresh_token) {
    throw new Error("登录响应缺少令牌");
  }
  return tokens;
}

export function logoutPlatform(): Promise<LogoutResponse> {
  const jti = getAccessTokenJti();
  if (!jti) return Promise.resolve({ status: "local-only" });

  return runIdempotentRequest(
    logoutScope,
    { jti },
    (data: LogoutRequest) =>
      coreRequest<LogoutResponse, LogoutRequest>("/auth/logout", {
        method: "POST",
        data,
      }),
    [jti],
  );
}

export type { AuthTokens, LogoutResponse, PlatformLoginInput } from "./types";
