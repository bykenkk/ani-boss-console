import { Form, Modal, Input, Select } from "@arco-design/web-react";
import { useEffect, useMemo, useRef } from "react";
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

interface ApiEditModalProps {
  record?: ResourceRecords["apis"];
  defaults?: ApiEditFormValues;
  onCancel: () => void;
  onSuccess: () => void;
}
interface ApiEditFormValues {
  description?: string;
  module?: string;
  moduleDescription?: string;
  path?: string;
  method?: string;
}
export function ApiEditModal(props: ApiEditModalProps) {
  const { record } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("apis", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("apis", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "apis", record?.id),
        action: "详情加载",
      },
    },
  });
  return (
    <ApiEditForm
      key={record?.id ?? "create"}
      {...props}
      record={detail.data ?? record}
      loading={!!record && detail.isPending}
      disabled={!!record && !detail.data}
    />
  );
}
interface ApiEditFormProps extends ApiEditModalProps {
  loading: boolean;
  disabled: boolean;
}

function ApiEditForm({
  record,
  defaults,
  onCancel,
  onSuccess,
  loading,
  disabled,
}: ApiEditFormProps) {
  const [form] = Form.useForm<ApiEditFormValues>();
  const initial = useMemo(() => {
    const values: ApiEditFormValues = {
      description: defaults?.description ?? record?.description ?? "",
      module: defaults?.module ?? record?.module ?? "",
      moduleDescription: defaults?.moduleDescription ?? record?.moduleDescription ?? "",
      path: defaults?.path ?? record?.path ?? "",
      method: defaults?.method ?? record?.method ?? (!record ? "GET" : ""),
    };
    return values;
  }, [record, defaults]);

  const changedFields = useRef(new Set<string>());
  const detailInitialized = useRef(!disabled);
  useEffect(() => {
    if (disabled || detailInitialized.current) return;
    form.setFieldsValue(initial);
    changedFields.current.clear();
    detailInitialized.current = true;
  }, [disabled, form, initial]);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: ApiEditFormValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("path")) values.path = submitted.path ?? "";
      if (!record || changedFields.current.has("method")) values.method = submitted.method ?? "";
      if (!record || changedFields.current.has("module")) values.module = submitted.module ?? "";
      if (!record || changedFields.current.has("moduleDescription"))
        values.moduleDescription = submitted.moduleDescription ?? "";
      if (!record || changedFields.current.has("description"))
        values.description = submitted.description ?? "";

      if (record && Object.keys(values).length === 0) return;
      await saveManagement("apis", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存API" } },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: managementKeys.all });
      onSuccess();
    },
  });
  const busy = loading || mutation.isPending;
  const submit = async () => {
    if (disabled || busy) return;
    try {
      mutation.mutate(await validateForm<ApiEditFormValues>(form));
    } catch {
      /* 统一校验入口已反馈 */
    }
  };
  return (
    <Modal
      visible
      title={record ? "编辑API" : "新建API"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: disabled || loading }}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      escToExit={!busy}
      style={{ width: 680 }}
    >
      <Form
        form={form}
        disabled={disabled || busy}
        layout="vertical"
        initialValues={initial}
        onValuesChange={(changed) => {
          Object.keys(changed).forEach((key) => changedFields.current.add(key));
        }}
      >
        <Form.Item field="description" label="API描述">
          <Input />
        </Form.Item>
        <Form.Item field="module" label="模块">
          <Input />
        </Form.Item>
        <Form.Item field="moduleDescription" label="模块描述">
          <Input />
        </Form.Item>
        <Form.Item
          field="path"
          label="API路径"
          rules={[{ required: true, message: "请填写API路径" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          field="method"
          label="请求方法"
          rules={[{ required: true, message: "请填写请求方法" }]}
        >
          <Select
            options={[
              { value: "GET", label: "GET" },
              { value: "POST", label: "POST" },
              { value: "PUT", label: "PUT" },
              { value: "PATCH", label: "PATCH" },
              { value: "DELETE", label: "DELETE" },
              { value: "HEAD", label: "HEAD" },
              { value: "OPTIONS", label: "OPTIONS" },
            ]}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
