import { Form, Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchPlatformAdministratorRoles,
  platformAdministratorQueryKeys,
  type PlatformAdministratorRole,
} from "@/api/platform-admins";
import { platformAdministratorRoleLabels } from "../model";
interface PlatformAdministratorRoleFieldsProps {
  currentRole?: PlatformAdministratorRole;
}
export function PlatformAdministratorRoleFields({
  currentRole,
}: PlatformAdministratorRoleFieldsProps) {
  const roles = useQuery({
    queryKey: platformAdministratorQueryKeys.roles,
    queryFn: fetchPlatformAdministratorRoles,
    meta: {
      errorNotification: {
        id: "platform-administrator-roles",
        action: "平台角色权限加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const options = (roles.data ?? [])
    .filter((role) => platformAdministratorRoleLabels[role.name])
    .map((role) => ({ value: role.id, label: platformAdministratorRoleLabels[role.name] }));
  const initialRoleId = (roles.data ?? []).find(
    (role) => role.name === (currentRole ?? "platform-ops"),
  )?.id;
  return (
    <Form.Item
      key={initialRoleId ?? "pending"}
      label="平台角色"
      field="roleId"
      initialValue={initialRoleId}
      rules={[{ required: true, message: "请选择角色" }]}
    >
      <Select
        loading={roles.isPending}
        options={options}
        placeholder={options.length ? "请选择角色" : "暂无可用角色"}
      />
    </Form.Item>
  );
}
