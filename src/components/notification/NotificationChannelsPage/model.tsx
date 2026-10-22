import type { NotificationChannel } from "@/api/notification-channels";
import { StatusBadge, type ListColumn } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { channelTlsLabels, channelTypeLabels } from "./constants";

export const notificationChannelColumns: ListColumn<NotificationChannel>[] = [
  { key: "name", title: "渠道名称", dataIndex: "name", width: 200, fixed: "left", ellipsis: true },
  {
    key: "type",
    title: "类型",
    width: 120,
    render: (_, row) => (row.type ? (channelTypeLabels[row.type] ?? row.type) : "-"),
  },
  {
    key: "smtpHost",
    title: "SMTP 服务器",
    width: 180,
    ellipsis: true,
    render: (_, row) => (row.type === "EMAIL" ? row.smtpHost || "-" : "-"),
  },
  {
    key: "smtpPort",
    title: "SMTP 端口",
    width: 110,
    render: (_, row) => (row.type === "EMAIL" ? (row.smtpPort ?? "-") : "-"),
  },
  {
    key: "smtpFrom",
    title: "发件人邮箱",
    width: 200,
    ellipsis: true,
    render: (_, row) => (row.type === "EMAIL" ? row.smtpFrom || "-" : "-"),
  },
  {
    key: "smtpTls",
    title: "加密方式",
    width: 120,
    render: (_, row) =>
      row.type === "EMAIL" && row.smtpTls ? (channelTlsLabels[row.smtpTls] ?? row.smtpTls) : "-",
  },
  {
    key: "hasPassword",
    title: "密码配置",
    width: 120,
    render: (_, row) =>
      row.type === "EMAIL" ? (
        <StatusBadge
          value={row.hasPassword ? "已配置" : "未配置"}
          tone={row.hasPassword ? "success" : "default"}
        />
      ) : (
        "-"
      ),
  },
  {
    key: "enabled",
    title: "状态",
    width: 120,
    render: (_, row) =>
      row.enabled === undefined ? (
        "-"
      ) : (
        <StatusBadge
          value={row.enabled ? "启用" : "停用"}
          tone={row.enabled ? "success" : "default"}
        />
      ),
  },
  { key: "remark", title: "备注", dataIndex: "remark", width: 200, ellipsis: true },
  {
    key: "createdAt",
    title: "创建时间",
    width: 180,
    render: (_, row) => formatDateTime(row.createdAt),
  },
];
