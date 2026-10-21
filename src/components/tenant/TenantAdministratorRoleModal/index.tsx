import { Form, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { validateForm } from "@/lib/form";
import {
  updateTenantAdministratorRole,
  tenantManagementQueryKeys,
  getTenantManagementErrorMessage,
  type TenantRoleDefinition,
} from "@/api/tenant";
import { TenantAdministratorRoleFields } from "./TenantAdministratorRoleFields";
interface TenantAdministratorRoleFormValues {
  roleId: string;
}
interface TenantAdministratorRoleModalProps {
  tenantId: string;
  administratorId: string;
  roles: TenantRoleDefinition[];
  currentRole: string;
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantAdministratorRoleModal({
  tenantId,
  administratorId,
  roles,
  currentRole,
  onCancel,
  onSuccess,
}: TenantAdministratorRoleModalProps) {
  const [form] = Form.useForm<TenantAdministratorRoleFormValues>();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "管理员角色更新",
        successText: "管理员角色已更新",
        errorFallback: "管理员角色更新失败，请稍后重试",
      },
    },
    mutationFn: async ({ roleId }: TenantAdministratorRoleFormValues) => {
      try {
        return await updateTenantAdministratorRole({ tenantId, userId: administratorId, roleId });
      } catch (error) {
        throw new Error(getTenantManagementErrorMessage(error));
      }
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      onSuccess();
    },
  });
  return (
    <Modal
      visible
      okText="保存角色"
      title="修改管理员角色"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          roleId: roles.find((role) => role.name === currentRole)?.id ?? roles[0]?.id,
        }}
      >
        <TenantAdministratorRoleFields roles={roles} />
      </Form>
    </Modal>
  );
}
