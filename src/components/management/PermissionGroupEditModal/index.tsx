import { Button, Form, Modal, Spin, Input, InputNumber, Select } from "@arco-design/web-react";
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

import { ManagementRelationSelect } from "../ManagementRelationSelect";
interface Props {
  record?: ResourceRecords["permission-groups"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function PermissionGroupEditModal(props: Props) {
  const { record, onCancel } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("permission-groups", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("permission-groups", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "permission-groups", record?.id),
        action: "详情加载",
      },
    },
  });
  return (
    <Modal
      visible
      title={record ? "编辑权限分组" : "新建权限分组"}
      footer={null}
      onCancel={onCancel}
      maskClosable={false}
      style={{ width: 680 }}
    >
      {!record || detail.isSuccess ? (
        <PermissionGroupEditForm {...props} record={detail.data ?? record} />
      ) : (
        <Spin loading={detail.isPending}>
          <div className="py-8">详情尚未加载，暂不能编辑。</div>
        </Spin>
      )}
    </Modal>
  );
}
function PermissionGroupEditForm({ record, defaults, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = {
    ...(!record ? { parentId: 0, sortOrder: 0, status: "ON" } : {}),
    ...record,
    ...defaults,
  };

  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("name")) values.name = submitted.name ?? "";
      if (!record || changedFields.current.has("module")) values.module = submitted.module ?? "";
      if (!record || changedFields.current.has("parentId"))
        values.parentId = submitted.parentId ?? 0;
      if (!record || changedFields.current.has("sortOrder"))
        values.sortOrder = submitted.sortOrder ?? 0;
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("description"))
        values.description = submitted.description ?? "";

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("permission-groups", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存权限分组" } },
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
        <Form.Item field="module" label="模块" rules={[{ required: true, message: "请填写模块" }]}>
          <Input />
        </Form.Item>

        <Form.Item field="parentId" label="上级分组">
          <ManagementRelationSelect
            resource="permission-groups"
            includeRoot
            excludeId={record?.id}
          />
        </Form.Item>
        <Form.Item field="sortOrder" label="排序">
          <InputNumber min={0} precision={0} />
        </Form.Item>
        <Form.Item field="status" label="状态" rules={[{ required: true, message: "请填写状态" }]}>
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
      </div>
      <div className="flex justify-end gap-3">
        <Button onClick={onCancel} disabled={mutation.isPending}>
          取消
        </Button>
        <Button type="primary" loading={mutation.isPending} onClick={submit}>
          保存
        </Button>
      </div>
    </Form>
  );
}
