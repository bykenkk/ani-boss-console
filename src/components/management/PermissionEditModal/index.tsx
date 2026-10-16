import { Form, Modal, Spin, Input, Select } from "@arco-design/web-react";
import { useRef } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  managementKeys,
  saveManagement,
  getManagement,
  type EditValues,
  type ResourceRecords,
} from "@/api/management";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";

import { PermissionGroupSelect } from "@/components/management/PermissionGroupSelect";
import { ApiTreeSelect } from "../ApiTreeSelect";
interface Props {
  record?: ResourceRecords["permissions"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function PermissionEditModal(props: Props) {
  const { record, onCancel } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("permissions", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("permissions", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "permissions", record?.id),
        action: "详情加载",
      },
    },
  });
  if (!record || detail.isSuccess) {
    return <PermissionEditForm {...props} record={detail.data ?? record} />;
  }
  return (
    <Modal
      visible
      title={record ? "编辑权限点" : "新建权限点"}
      okText="保存"
      okButtonProps={{ disabled: true }}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 680 }}
    >
      {detail.isPending && (
        <div className="flex justify-center py-8">
          <Spin />
        </div>
      )}
    </Modal>
  );
}
function PermissionEditForm({ record, defaults, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = {
    ...(!record ? { status: "ON", apiIds: [] } : {}),
    ...record,
    ...defaults,
  };

  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("name")) values.name = submitted.name ?? "";
      if (!record || changedFields.current.has("code")) values.code = submitted.code ?? "";
      if (!record || changedFields.current.has("groupId")) values.groupId = submitted.groupId ?? 0;
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("description"))
        values.description = submitted.description ?? "";
      if (!record || changedFields.current.has("apiIds")) values.apiIds = submitted.apiIds ?? [];

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("permissions", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存权限点" } },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: managementKeys.all });
      onSuccess();
    },
  });
  const submit = async () => {
    if (mutation.isPending) return;
    try {
      mutation.mutate(await validateForm<EditValues>(form));
    } catch {
      /* 统一校验入口已反馈 */
    }
  };
  return (
    <Modal
      visible
      title={record ? "编辑权限点" : "新建权限点"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
      maskClosable={false}
      style={{ width: 680 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={initial}
        onValuesChange={(changed) => {
          Object.keys(changed).forEach((key) => changedFields.current.add(key));
        }}
      >
        <div className="grid grid-cols-1 gap-x-6 md:grid-cols-2">
          <Form.Item field="name" label="名称" rules={[{ required: true, message: "请填写名称" }]}>
            <Input />
          </Form.Item>
          <Form.Item field="code" label="编码" rules={[{ required: true, message: "请填写编码" }]}>
            <Input />
          </Form.Item>
          <Form.Item field="groupId" label="权限分组">
            <PermissionGroupSelect />
          </Form.Item>
          <Form.Item
            field="status"
            label="状态"
            rules={[{ required: true, message: "请填写状态" }]}
          >
            <Select
              options={[
                { value: "ON", label: "启用" },
                { value: "OFF", label: "禁用" },
              ]}
            />
          </Form.Item>
          <Form.Item field="description" label="说明" className="md:col-span-2">
            <Input.TextArea />
          </Form.Item>
          <Form.Item field="apiIds" label="关联 API" className="md:col-span-2">
            <ApiTreeSelect />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
