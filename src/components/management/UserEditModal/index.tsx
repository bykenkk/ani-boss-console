import { Form, Modal } from "@arco-design/web-react";
import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  managementKeys,
  saveManagement,
  getManagement,
  type EditValues,
  type ManagedUser,
} from "@/api/management";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";
import {
  UserEditForm,
  type UserEditFormValues,
  type UserScope,
} from "@/components/management/UserEditForm";

interface UserEditModalProps {
  record: ManagedUser;
  userScope: UserScope;
  onCancel: () => void;
  onSuccess: () => void;
}

export function UserEditModal({ record, userScope, onCancel, onSuccess }: UserEditModalProps) {
  const [form] = Form.useForm<UserEditFormValues>();
  const detail = useQuery({
    queryKey: managementKeys.detail("users", record.id),
    queryFn: ({ signal }) => getManagement("users", record.id, signal),
    meta: {
      errorNotification: {
        id: withId("management-detail", "users", record.id),
        action: "详情加载",
      },
    },
  });
  const initialValues = useMemo<UserEditFormValues>(() => {
    const user = detail.data ?? record;
    return {
      tenantId: userScope === "platform" ? 0 : user.tenantId,
      username: user.username,
      roleIds: user.roleIds ?? (user.roleId ? [user.roleId] : []),
      nickname: user.nickname,
      realname: user.realname,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
    };
  }, [detail.data, record, userScope]);
  const changedFields = useRef(new Set<string>());
  const detailInitialized = useRef(false);
  useEffect(() => {
    if (!detail.data || detailInitialized.current) return;
    form.setFieldsValue(initialValues);
    changedFields.current.clear();
    detailInitialized.current = true;
  }, [detail.data, form, initialValues]);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: UserEditFormValues) => {
      const values: EditValues = {};
      if (changedFields.current.has("realname")) values.realname = submitted.realname ?? "";
      if (changedFields.current.has("nickname")) values.nickname = submitted.nickname ?? "";
      if (changedFields.current.has("email")) values.email = submitted.email ?? "";
      if (changedFields.current.has("mobile")) values.mobile = submitted.mobile ?? "";
      if (changedFields.current.has("roleIds")) values.roleIds = submitted.roleIds ?? [];
      if (changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (Object.keys(values).length === 0) return;
      await saveManagement("users", { id: record.id, values });
    },
    meta: { feedback: { channel: "message", action: "保存用户" } },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: managementKeys.all });
      onSuccess();
    },
  });
  const busy = detail.isPending || mutation.isPending;
  const disabled = !detail.data || busy;
  const submit = async () => {
    if (disabled) return;
    try {
      mutation.mutate(await validateForm<UserEditFormValues>(form));
    } catch {
      /* 统一校验入口已反馈 */
    }
  };
  return (
    <Modal
      visible
      title={userScope === "platform" ? "编辑平台管理员" : "编辑租户管理员"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: !detail.data || detail.isPending }}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      escToExit={!busy}
      style={{ width: 680 }}
    >
      <UserEditForm
        form={form}
        mode="edit"
        userScope={userScope}
        initialValues={initialValues}
        disabled={disabled}
        onValuesChange={(changed) => {
          Object.keys(changed).forEach((key) => changedFields.current.add(key));
        }}
      />
    </Modal>
  );
}
