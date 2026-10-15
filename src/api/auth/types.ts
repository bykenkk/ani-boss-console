export interface AuthTokens {
  access_token: string;
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
  session_revoked: boolean;
}

export interface CurrentUser {
  id?: number;
  username?: string;
  nickname?: string;
  realname?: string;
  avatar?: string;
  roles?: string[];
  roleNames?: string[];
  lastLoginAt?: string;
}
