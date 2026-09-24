import { Descriptions } from "@arco-design/web-react";
import type { PlatformAdministratorDetail } from "@/api/platform-admins";
import { formatDateTime } from "@/lib/date";
import { PlatformAdministratorStatusBadge } from "../../PlatformAdministratorStatusBadge";
import { platformAdministratorRoleLabels, platformAdministratorSourceLabels } from "../../model";

export function AccountOverview({ detail }: { detail: PlatformAdministratorDetail }) {
  return (
    <>
      <Descriptions
        column={1}
        data={[
          { label: "用户 ID", value: detail.id },
          { label: "用户名", value: detail.username },
          { label: "显示名称", value: detail.displayName || "-" },
          { label: "邮箱", value: detail.email || "-" },
          { label: "角色", value: platformAdministratorRoleLabels[detail.role] },
          {
            label: "状态",
            value: <PlatformAdministratorStatusBadge status={detail.status} />,
          },
          { label: "账号来源", value: platformAdministratorSourceLabels[detail.source] },
          // { label: "MFA", value: "-" },
          { label: "最近登录", value: formatDateTime(detail.lastLoginAt) },
          { label: "创建时间", value: formatDateTime(detail.createdAt) },
          { label: "最近重置密码", value: "-" },
          { label: "安装账号", value: "-" },
        ]}
      />
      <div className="mt-3 text-xs text-gray-500">
        MFA、最近重置密码和安装账号字段待后端接口补充。
      </div>
    </>
  );
}
