import type { AuditLogKind, LoginAuditStatus } from "@/api/audit-logs";

export const auditTitles: Record<AuditLogKind, string> = {
  operation: "操作审计",
  login: "登录审计",
  api: "API 审计",
};

export const loginStatusLabels: Record<LoginAuditStatus, string> = {
  STATUS_UNSPECIFIED: "未指定",
  SUCCESS: "成功",
  FAILED: "失败",
  PARTIAL: "部分完成",
  LOCKED: "已锁定",
};

export const auditActionLabels: Record<string, string> = {
  ACTION_TYPE_UNSPECIFIED: "未指定",
  LOGIN: "登录",
  LOGOUT: "登出",
  SESSION_EXPIRED: "会话过期",
  KICKED_OUT: "强制下线",
  PASSWORD_RESET: "密码重置",
  CREATE: "创建",
  UPDATE: "更新",
  DELETE: "删除",
  READ: "读取",
  ASSIGN: "分配",
  UNASSIGN: "取消分配",
  EXPORT: "导出",
  IMPORT: "导入",
  OTHER: "其他",
};
