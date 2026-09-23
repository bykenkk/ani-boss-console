import { StatusBadge } from "@/components/common";
import { Descriptions, Drawer } from "@arco-design/web-react";
import type { PlatformAuditLogItem } from "@/api/audit";
import { formatDateTime } from "@/lib/date";
import { auditVerbLabels, formatAuditResource, isSuccessfulAudit } from "./model";

export function PlatformAuditDetailDrawer({
  item,
  onClose,
}: {
  item?: PlatformAuditLogItem;
  onClose: () => void;
}) {
  const success = item ? isSuccessfulAudit(item) : false;

  return (
    <Drawer width={640} title="审计详情" visible={Boolean(item)} onCancel={onClose} footer={null}>
      {item ? (
        <Descriptions
          column={1}
          border
          data={[
            { label: "审计 ID", value: item.auditId || "-" },
            { label: "时间", value: formatDateTime(item.timestamp) },
            { label: "操作者", value: item.user.username || "-" },
            { label: "用户组", value: item.user.groups.join("、") || "-" },
            { label: "动作", value: auditVerbLabels[item.verb] },
            { label: "资源", value: formatAuditResource(item) },
            {
              label: "结果",
              value: (
                <StatusBadge
                  tone={success ? "success" : "danger"}
                  value={`${success ? "成功" : "失败"} · ${item.responseCode || "-"}`}
                />
              ),
            },
            {
              label: "请求 URI",
              value: <div className="break-all">{item.detail.requestUri || "-"}</div>,
            },
            {
              label: "User-Agent",
              value: <div className="break-all">{item.detail.userAgent || "-"}</div>,
            },
          ]}
        />
      ) : null}
    </Drawer>
  );
}
