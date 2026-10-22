import { Form, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  resetPlatformAdministratorPassword,
  platformAdministratorQueryKeys,
  getPlatformAdministratorErrorMessage,
  type PlatformAdministratorListItem,
} from "@/api/platform-admins";
import { validateForm } from "@/lib/form";
import { PlatformAdministratorPasswordFields } from "../PlatformAdministratorPasswordFields";
interface PlatformAdministratorPasswordModalProps {
  target: PlatformAdministratorListItem;
  onCancel: () => void;
  onSuccess: () => void;
}
interface PlatformAdministratorPasswordFormValues {
  newPassword: string;
  confirmPassword: string;
}
export function PlatformAdministratorPasswordModal({
  target,
  onCancel,
  onSuccess,
}: PlatformAdministratorPasswordModalProps) {
  const [form] = Form.useForm<PlatformAdministratorPasswordFormValues>();
  const client = useQueryClient();
  const mutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "账号密码重置",
        successText: "账号密码已重置",
        errorFallback: "账号密码重置失败，请稍后重试",
      },
    },
    mutationFn: async ({ newPassword }: PlatformAdministratorPasswordFormValues) => {
      try {
        return await resetPlatformAdministratorPassword({ userId: target.id, newPassword });
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
      title={"重置密码：" + target.displayName}
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      onCancel={onCancel}
      onOk={async () => mutation.mutate(await validateForm(form))}
    >
      <Form form={form} layout="vertical">
        <PlatformAdministratorPasswordFields
          getPassword={() => form.getFieldValue("newPassword")}
        />
      </Form>
    </Modal>
  );
}
