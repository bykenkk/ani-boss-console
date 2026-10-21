import { Form, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  updatePlatformAdministratorRole,
  platformAdministratorQueryKeys,
  getPlatformAdministratorErrorMessage,
  type PlatformAdministratorListItem,
} from "@/api/platform-admins";
import { validateForm } from "@/lib/form";
import { PlatformAdministratorRoleFields } from "../PlatformAdministratorRoleFields";
interface PlatformAdministratorRoleModalProps {
  target: PlatformAdministratorListItem;
  onCancel: () => void;
  onSuccess: () => void;
}
interface PlatformAdministratorRoleFormValues {
  roleId: string;
}
export function PlatformAdministratorRoleModal({
  target,
  onCancel,
  onSuccess,
}: PlatformAdministratorRoleModalProps) {
  const [form] = Form.useForm<PlatformAdministratorRoleFormValues>();
  const client = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "账号角色更新",
        successText: "账号角色已更新",
        errorFallback: "账号角色更新失败，请稍后重试",
      },
    },
    mutationFn: async ({ roleId }: PlatformAdministratorRoleFormValues) => {
      try {
        return await updatePlatformAdministratorRole({ userId: target.id, roleId });
      } catch (error) {
        throw new Error(getPlatformAdministratorErrorMessage(error));
      }
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: platformAdministratorQueryKeys.all });
      onSuccess();
    },
  });
  return (
    <Modal
      visible
      title={"修改角色：" + target.displayName}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form form={form} layout="vertical">
        <PlatformAdministratorRoleFields currentRole={target.role} />
      </Form>
    </Modal>
  );
}
