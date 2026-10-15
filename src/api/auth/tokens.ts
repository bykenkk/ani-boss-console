import type { AuthTokenResponse, AuthTokens } from "./types";

export function normalizeAuthTokens(response: AuthTokenResponse): AuthTokens {
  if (response?.mfa_required) {
    throw new Error("此账号需要二次验证，当前平台登录入口暂不支持");
  }
  if (typeof response?.access_token !== "string" || !response.access_token.trim()) {
    throw new Error("认证响应缺少 access_token");
  }
  // protobuf int64 在 JSON 中可能编码为字符串。
  const expiresIn = response.expires_in === undefined ? undefined : Number(response.expires_in);
  return {
    access_token: response.access_token,
    expires_in:
      expiresIn !== undefined && Number.isFinite(expiresIn) && expiresIn > 0
        ? expiresIn
        : undefined,
    issued_at: response.issued_at,
  };
}
