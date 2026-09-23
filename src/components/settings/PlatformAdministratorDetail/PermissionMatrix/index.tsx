import { Alert, Button, Card } from "@arco-design/web-react";
import type { PlatformAdministratorRole } from "@/api/platform-admins";
import { platformAdministratorRoleLabels } from "../../model";

interface PermissionRow {
  scope: string;
  access: Record<PlatformAdministratorRole, "allow" | "read" | "deny">;
}

const permissionRows: PermissionRow[] = [
  {
    scope: "租户开通/冻结",
    access: {
      "platform-admin": "allow",
      "platform-ops": "allow",
      "platform-readonly": "read",
    },
  },
  {
    scope: "平台资源池",
    access: {
      "platform-admin": "allow",
      "platform-ops": "allow",
      "platform-readonly": "read",
    },
  },
  {
    scope: "平台运营账号",
    access: {
      "platform-admin": "allow",
      "platform-ops": "deny",
      "platform-readonly": "deny",
    },
  },
  {
    scope: "计量结算",
    access: {
      "platform-admin": "allow",
      "platform-ops": "read",
      "platform-readonly": "read",
    },
  },
  {
    scope: "审计导出",
    access: {
      "platform-admin": "allow",
      "platform-ops": "deny",
      "platform-readonly": "allow",
    },
  },
];

const matrixRoles: { label: string; role: PlatformAdministratorRole }[] = [
  { label: "超管", role: "platform-admin" },
  { label: "运维", role: "platform-ops" },
  { label: "只读", role: "platform-readonly" },
];

const accessPresentation = {
  allow: { className: "text-green-600", label: "✓" },
  read: { className: "text-blue-600", label: "查" },
  deny: { className: "text-gray-400", label: "✗" },
} as const;

export function PermissionMatrix({
  currentRole,
  canManage,
  onChangeRole,
}: {
  currentRole: PlatformAdministratorRole;
  canManage: boolean;
  onChangeRole: () => void;
}) {
  return (
    <div className="space-y-4 py-2">
      <Alert
        type="info"
        showIcon
        content="平台运营账号仅用于登录管理端，不属于租户，也不会同步为租户成员。"
      />
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-gray-900">
            当前角色：{platformAdministratorRoleLabels[currentRole]}
          </div>
        </div>
        <Button disabled={!canManage} onClick={onChangeRole}>
          修改角色
        </Button>
      </div>
      <div className="space-y-2">
        {permissionRows.map((row) => (
          <Card key={row.scope} className="[&_.arco-card-body]:px-4 [&_.arco-card-body]:py-3">
            <div className="text-base font-semibold text-gray-900">{row.scope}</div>
            <div className="mt-1 grid grid-cols-1 gap-2 text-sm text-gray-600 sm:grid-cols-3">
              {matrixRoles.map(({ label, role }) => {
                const presentation = accessPresentation[row.access[role]];

                return (
                  <div key={role}>
                    {label} <span className={presentation.className}>{presentation.label}</span>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
