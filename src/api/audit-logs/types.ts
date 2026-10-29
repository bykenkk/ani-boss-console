import type { PageParams } from "@/api/types";

export type AuditLogKind = "login" | "api" | "operation";
export type LoginAuditAction =
  | "ACTION_TYPE_UNSPECIFIED"
  | "LOGIN"
  | "LOGOUT"
  | "SESSION_EXPIRED"
  | "KICKED_OUT"
  | "PASSWORD_RESET";
export type LoginAuditStatus = "STATUS_UNSPECIFIED" | "SUCCESS" | "FAILED" | "PARTIAL" | "LOCKED";
export type OperationAuditAction =
  | "ACTION_TYPE_UNSPECIFIED"
  | "CREATE"
  | "UPDATE"
  | "DELETE"
  | "READ"
  | "ASSIGN"
  | "UNASSIGN"
  | "EXPORT"
  | "IMPORT"
  | "OTHER";

export interface AuditDeviceInfo {
  clientId?: string;
  clientName?: string;
  osName?: string;
  osVersion?: string;
  deviceId?: string;
  deviceType?: "DEVICE_TYPE_UNSPECIFIED" | "DESKTOP" | "MOBILE" | "TABLET" | "BOT" | "OTHER";
  manufacturer?: string;
  model?: string;
  platform?: string;
  osBuild?: string;
  appName?: string;
  appVersion?: string;
  screenWidth?: number;
  screenHeight?: number;
  locale?: string;
  timeZone?: string;
  networkType?: string;
  carrier?: string;
  deviceFingerprint?: string;
  userAgent?: string;
  browserName?: string;
  browserVersion?: string;
  browserEngine?: string;
  engineVersion?: string;
}

interface AuditLogBase {
  id?: number;
  tenantId?: number;
  // TODO(audit-fields): 后端补齐租户名称与链路信息写入后，联调验证字段回显。
  tenantName?: string;
  userId?: number;
  username?: string;
  ipAddress?: string;
  requestId?: string;
  traceId?: string;
  logHash?: string;
  signature?: string;
  createdAt?: string;
}

export interface LoginAuditLog extends AuditLogBase {
  sessionId?: string;
  deviceInfo?: AuditDeviceInfo;
  actionType?: LoginAuditAction;
  status?: LoginAuditStatus;
  failureReason?: string;
  mfaStatus?: "UNVERIFIED" | "VERIFYING" | "VERIFIED" | "FAILED";
  loginMethod?:
    | "LOGIN_METHOD_UNSPECIFIED"
    | "PASSWORD"
    | "SMS_CODE"
    | "QR_CODE"
    | "OIDC_SOCIAL"
    | "BIOMETRIC"
    | "FIDO2";
  riskScore?: number;
  riskLevel?: "RISK_LEVEL_UNSPECIFIED" | "LOW" | "MEDIUM" | "HIGH";
  riskFactors?: string[];
}

export interface ApiAuditLog extends AuditLogBase {
  subject_type?: string;
  subject_id?: number;
  deviceInfo?: AuditDeviceInfo;
  referer?: string;
  appVersion?: string;
  httpMethod?: string;
  path?: string;
  requestUri?: string;
  apiModule?: string;
  apiOperation?: string;
  apiDescription?: string;
  spanId?: string;
  latencyMs?: number;
  success?: boolean;
  statusCode?: number;
  reason?: string;
  requestHeader?: string;
  requestBody?: string;
  response?: string;
}

export interface OperationAuditLog extends AuditLogBase {
  resourceType?: string;
  resourceId?: string;
  action?: OperationAuditAction;
  // TODO(audit-fields): 当前写入侧未填充变更前后数据和敏感等级，补齐后验证详情展示。
  beforeData?: string;
  afterData?: string;
  sensitiveLevel?:
    | "SENSITIVE_LEVEL_UNSPECIFIED"
    | "PUBLIC"
    | "INTERNAL"
    | "CONFIDENTIAL"
    | "SECRET";
  success?: boolean;
  failureReason?: string;
}

export interface AuditLogByKind {
  login: LoginAuditLog;
  api: ApiAuditLog;
  operation: OperationAuditLog;
}
export type AuditLog = AuditLogByKind[AuditLogKind];

export interface AuditLogList<T> {
  items: T[];
  total: string;
}

export interface AuditLogFilters {
  username__icontains?: string;
  ip_address?: string;
  request_id?: string;
  created_at__gte?: string;
  created_at__lte?: string;
  status?: LoginAuditStatus;
  action_type?: LoginAuditAction;
  action?: OperationAuditAction;
  success?: boolean;
}

export interface AuditLogListParams extends PageParams {
  filters?: AuditLogFilters;
}
