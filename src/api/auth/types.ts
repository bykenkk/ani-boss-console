export interface AuthTokens {
  access_token: string;
  /** 仅存量 ANI 会话使用；新后端通过 HttpOnly Cookie 刷新。 */
  refresh_token?: string;
  expires_in?: number;
  issued_at?: string;
}

export interface AuthTokenResponse {
  access_token: string;
  expires_in?: number | string;
  issued_at?: string;
  mfa_required?: boolean;
  mfa_operation_id?: string;
}

export interface PlatformLoginInput {
  username: string;
  password: string;
}

export interface LogoutResponse {
  status: string;
}
