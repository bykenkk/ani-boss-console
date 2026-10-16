import { Form, Modal, Spin, Input, Select, Switch } from "@arco-design/web-react";
import { useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  managementKeys,
  saveManagement,
  getManagement,
  createTenantWithAdministrator,
  type EditValues,
  type ResourceRecords,
} from "@/api/management";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";
import { formatDateTime, toRfc3339DateTime } from "@/lib/date";
import { PlanSelect } from "@/components/tenant/PlanSelect";
interface Props {
  record?: ResourceRecords["tenants"];
  defaults?: EditValues;
  onCancel: () => void;
  onSuccess: () => void;
}
export function TenantEditModal(props: Props) {
  const { record, onCancel } = props;
  const detail = useQuery({
    queryKey: managementKeys.detail("tenants", record?.id ?? 0),
    queryFn: ({ signal }) => getManagement("tenants", record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "tenants", record?.id),
        action: "详情加载",
      },
    },
  });
  if (!record || detail.isSuccess) {
    return <TenantEditForm {...props} record={detail.data ?? record} />;
  }
  return (
    <Modal
      visible
      title={record ? "编辑租户" : "新建租户"}
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
function TenantEditForm({ record, defaults, onCancel, onSuccess }: Props) {
  const [form] = Form.useForm<EditValues>();
  const initial: EditValues = {
    ...(!record ? { type: "TRIAL", status: "ON" } : {}),
    ...record,
    ...defaults,
  };
  if (initial.expiredAt) initial.expiredAt = formatDateTime(String(initial.expiredAt), "");

  const [withAdmin, setWithAdmin] = useState(false);
  const changedFields = useRef(new Set<string>());
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("name")) values.name = submitted.name ?? "";
      if (!record || changedFields.current.has("code")) values.code = submitted.code ?? "";
      if (!record || changedFields.current.has("type")) values.type = submitted.type ?? "";
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("planId")) values.planId = submitted.planId ?? 0;
      if (!record || changedFields.current.has("domain")) values.domain = submitted.domain ?? "";
      if (!record || changedFields.current.has("industry"))
        values.industry = submitted.industry ?? "";
      if (!record || changedFields.current.has("expiredAt"))
        values.expiredAt = submitted.expiredAt
          ? toRfc3339DateTime(String(submitted.expiredAt))
          : null;
      if (!record || changedFields.current.has("subscriptionPlan"))
        values.subscriptionPlan = submitted.subscriptionPlan ?? "";
      if (!record || changedFields.current.has("remark")) values.remark = submitted.remark ?? "";
      if (!record && withAdmin) {
        await createTenantWithAdministrator({
          tenant: values,
          user: {
            username: String(submitted.adminUsername),
            email: String(submitted.adminEmail ?? ""),
          },
          password: String(submitted.adminPassword),
        });
        return;
      }
      if (record && Object.keys(values).length === 0) return;
      await saveManagement("tenants", { id: record?.id, values: values });
    },
    meta: { feedback: { channel: "message", action: "保存租户" } },
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
      title={record ? "编辑租户" : "新建租户"}
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
        disabled={mutation.isPending}
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
          <Form.Item field="type" label="类型">
            <Select
              options={[
                { value: "TRIAL", label: "试用" },
                { value: "PAID", label: "付费" },
                { value: "INTERNAL", label: "内部" },
                { value: "PARTNER", label: "合作伙伴" },
                { value: "CUSTOM", label: "定制" },
              ]}
            />
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
                { value: "FREEZE", label: "冻结" },
                { value: "EXPIRED", label: "过期" },
              ]}
            />
          </Form.Item>
          <Form.Item field="planId" label="套餐">
            <PlanSelect />
          </Form.Item>
          <Form.Item field="domain" label="专属域名">
            <Input />
          </Form.Item>
          <Form.Item field="industry" label="行业">
            <Input />
          </Form.Item>
          <Form.Item
            field="expiredAt"
            label="有效期至"
            rules={[
              {
                validator: (value: unknown, callback: (message?: string) => void) => {
                  if (value && !toRfc3339DateTime(String(value)))
                    callback("请输入有效日期：YYYY-MM-DD HH:mm:ss");
                  else callback();
                },
              },
            ]}
          >
            <Input placeholder="YYYY-MM-DD HH:mm:ss，留空为永久" />
          </Form.Item>
          <Form.Item field="subscriptionPlan" label="订阅说明">
            <Input />
          </Form.Item>
          <Form.Item field="remark" label="备注" className="md:col-span-2">
            <Input.TextArea />
          </Form.Item>
        </div>
        {!record && (
          <>
            <Form.Item label="同时创建管理员">
              <Switch checked={withAdmin} onChange={setWithAdmin} disabled={mutation.isPending} />
            </Form.Item>
            {withAdmin && (
              <>
                <Form.Item field="adminUsername" label="管理员用户名" rules={[{ required: true }]}>
                  <Input />
                </Form.Item>
                <Form.Item field="adminEmail" label="管理员邮箱" rules={[{ type: "email" }]}>
                  <Input />
                </Form.Item>
                <Form.Item
                  field="adminPassword"
                  label="管理员初始密码"
                  rules={[{ required: true }]}
                >
                  <Input.Password autoComplete="new-password" />
                </Form.Item>
              </>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
