import type { PlatformAuditLogItem, PlatformAuditVerb } from "@/api/audit";
import { type ListColumn, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";

export const auditVerbOptions: Array<{ label: string; value: PlatformAuditVerb | "all" }> = [
  { label: "全部动作", value: "all" },
  { label: "创建", value: "create" },
  { label: "更新", value: "update" },
  { label: "修改", value: "patch" },
  { label: "删除", value: "delete" },
];

export const auditVerbLabels: Record<PlatformAuditVerb, string> = {
  create: "创建",
  update: "更新",
  patch: "修改",
  delete: "删除",
};

export function formatAuditResource(item: PlatformAuditLogItem) {
  const path = [item.resource.namespace, item.resource.resource, item.resource.name].filter(
    Boolean,
  );
  return path.join(" / ") || "-";
}

export function isSuccessfulAudit(item: PlatformAuditLogItem) {
  return item.responseCode >= 200 && item.responseCode < 400;
}

export function getPlatformAuditColumns(): ListColumn<PlatformAuditLogItem>[] {
  return [
    {
      title: "时间",
      dataIndex: "timestamp",
      width: 180,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "操作者",
      key: "username",
      width: 240,
      render: (_, item) => item.user.username || "-",
    },
    {
      title: "动作",
      dataIndex: "verb",
      width: 100,
      render: (value: PlatformAuditVerb) => auditVerbLabels[value],
    },
    {
      title: "资源",
      key: "resource",
      width: 320,
      render: (_, item) => formatAuditResource(item),
    },
    {
      title: "结果",
      key: "result",
      width: 160,
      render: (_, item) => {
        const success = isSuccessfulAudit(item);
        return (
          <StatusBadge
            tone={success ? "success" : "danger"}
            value={`${success ? "成功" : "失败"} · ${item.responseCode || "-"}`}
          />
        );
      },
    },
  ];
}

function sanitizeSpreadsheetValue(value: string) {
  return /^[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number) {
  const safe = sanitizeSpreadsheetValue(String(value));
  return `"${safe.replaceAll('"', '""')}"`;
}

export function downloadPlatformAuditCsv(items: PlatformAuditLogItem[]) {
  const rows = [
    [
      "时间",
      "操作者",
      "动作",
      "命名空间",
      "资源类型",
      "资源名称",
      "响应码",
      "请求 URI",
      "User-Agent",
      "审计 ID",
    ],
    ...items.map((item) => [
      item.timestamp,
      item.user.username,
      auditVerbLabels[item.verb],
      item.resource.namespace,
      item.resource.resource,
      item.resource.name,
      item.responseCode,
      item.detail.requestUri,
      item.detail.userAgent,
      item.auditId,
    ]),
  ];
  const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\ufeff", csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "platform-audit-logs.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
