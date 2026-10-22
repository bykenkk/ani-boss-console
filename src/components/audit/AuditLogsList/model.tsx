import type { AuditLog, AuditLogKind } from "@/api/audit-logs";
import { type ListColumn } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { AuditResult } from "../AuditResult";
import { auditActionLabels } from "./constants";

export function getAuditAction(item: AuditLog) {
  if ("actionType" in item)
    return auditActionLabels[item.actionType ?? ""] ?? item.actionType ?? "-";
  if ("action" in item) return auditActionLabels[item.action ?? ""] ?? item.action ?? "-";
  if ("apiOperation" in item) return item.apiOperation || "-";
  return "-";
}

export function getAuditColumns(kind: AuditLogKind): ListColumn<AuditLog>[] {
  const columns: ListColumn<AuditLog>[] = [
    {
      title: "时间",
      dataIndex: "createdAt",
      width: 180,
      render: (value?: string) => formatDateTime(value),
    },
    {
      title: "操作者",
      dataIndex: "username",
      width: 160,
      ellipsis: true,
      render: (value?: string) => value || "-",
    },
    {
      title: "动作",
      key: "action",
      width: kind === "api" ? 320 : 140,
      ellipsis: true,
      render: (_, item) => getAuditAction(item),
    },
    {
      title: "IP 地址",
      dataIndex: "ipAddress",
      width: 160,
      ellipsis: true,
      render: (value?: string) => value || "-",
    },
  ];
  if (kind === "api") {
    columns.push(
      {
        title: "请求方法",
        dataIndex: "httpMethod",
        width: 110,
        render: (value?: string) => value || "-",
      },
      {
        title: "请求路径",
        dataIndex: "path",
        width: 280,
        ellipsis: true,
        render: (value?: string) => value || "-",
      },
      {
        title: "状态码",
        dataIndex: "statusCode",
        width: 100,
        render: (value?: number) => value ?? "-",
      },
      {
        title: "耗时（ms）",
        dataIndex: "latencyMs",
        width: 180,
        render: (value?: number) => value ?? "-",
      },
    );
  } else if (kind === "operation") {
    columns.push(
      {
        title: "资源类型",
        dataIndex: "resourceType",
        width: 180,
        ellipsis: true,
        render: (value?: string) => value || "-",
      },
      {
        title: "资源 ID",
        dataIndex: "resourceId",
        width: 150,
        ellipsis: true,
        render: (value?: string) => value || "-",
      },
    );
  } else {
    columns.push(
      {
        title: "风险等级",
        dataIndex: "riskLevel",
        width: 120,
        render: (value?: string) =>
          ({ LOW: "低", MEDIUM: "中", HIGH: "高", RISK_LEVEL_UNSPECIFIED: "未指定" })[
            value ?? ""
          ] ??
          value ??
          "-",
      },
      {
        title: "风险评分",
        dataIndex: "riskScore",
        width: 100,
        render: (value?: number) => value ?? "-",
      },
    );
  }
  if (kind === "operation") {
    columns.push({
      title: "请求 ID",
      dataIndex: "requestId",
      width: 240,
      ellipsis: true,
      render: (value?: string) => value || "-",
    });
  } else {
    columns.push({
      title: "设备平台",
      key: "device",
      width: 200,
      ellipsis: true,
      render: (_, item) => {
        const device = "deviceInfo" in item ? item.deviceInfo : undefined;
        return (
          [device?.osName || device?.platform, device?.browserName].filter(Boolean).join(" / ") ||
          "-"
        );
      },
    });
  }
  columns.push({
    title: "结果",
    key: "result",
    width: 110,
    render: (_, item) => <AuditResult item={item} />,
  });
  return columns;
}
