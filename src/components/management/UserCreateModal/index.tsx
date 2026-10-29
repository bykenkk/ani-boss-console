import { Form, Modal } from "@arco-design/web-react";
import { useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { managementKeys, saveManagement } from "@/api/management";
import { validateForm } from "@/lib/form";
import {
  UserEditForm,
  type UserEditFormValues,
  type UserScope,
} from "@/components/management/UserEditForm";

interface UserCreateModalProps {
  userScope: UserScope;
  defaultTenantId?: number;
  onCancel: () => void;
  onSuccess: () => void;
}

export function UserCreateModal({
  userScope,
  defaultTenantId,
  onCancel,
  onSuccess,
}: UserCreateModalProps) {
  const [form] = Form.useForm<UserEditFormValues>();
  const initialValues = useMemo<UserEditFormValues>(
    () => ({
      tenantId: userScope === "platform" ? 0 : defaultTenantId,
      roleIds: [],
      status: "NORMAL",
    }),
    [defaultTenantId, userScope],
  );
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: (submitted: UserEditFormValues) =>
      saveManagement("users", {
        values: {
          tenantId: userScope === "platform" ? 0 : (submitted.tenantId ?? 0),
          username: submitted.username ?? "",
          password: submitted.password ?? "",
          roleIds: submitted.roleIds ?? [],
          nickname: submitted.nickname ?? "",
          realname: submitted.realname ?? "",
          email: submitted.email ?? "",
          mobile: submitted.mobile ?? "",
          status: submitted.status ?? "",
        },
      }),
    meta: { feedback: { channel: "message", action: "保存用户" } },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: managementKeys.all });
      onSuccess();
    },
  });
  const submit = async () => {
    if (mutation.isPending) return;
    try {
      mutation.mutate(await validateForm<UserEditFormValues>(form));
    } catch {
      /* 统一校验入口已反馈 */
    }
  };
  return (
    <Modal
      visible
      title={userScope === "platform" ? "新建平台管理员" : "新建租户管理员"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
      style={{ width: 680 }}
    >
      <UserEditForm
        form={form}
        mode="create"
        userScope={userScope}
        initialValues={initialValues}
        disabled={mutation.isPending}
      />
    </Modal>
  );
}
