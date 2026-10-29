import { DatePicker, Form, Modal, Input, Select, Switch } from "@arco-design/web-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
  const { record } = props;
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
  return (
    <TenantEditForm
      key={record?.id ?? "create"}
      {...props}
      record={detail.data ?? record}
      loading={!!record && detail.isPending}
      disabled={!!record && !detail.data}
    />
  );
}
interface TenantEditFormProps extends Props {
  loading: boolean;
  disabled: boolean;
}

function TenantEditForm({
  record,
  defaults,
  onCancel,
  onSuccess,
  loading,
  disabled,
}: TenantEditFormProps) {
  const [form] = Form.useForm<EditValues>();
  const initial = useMemo(() => {
    const values: EditValues = {
      ...(!record ? { type: "TRIAL", status: "ON", auditStatus: "APPROVED" } : {}),
      ...record,
      ...defaults,
    };
    if (values.expiredAt) values.expiredAt = formatDateTime(String(values.expiredAt), "");
    return values;
  }, [record, defaults]);

  const [withAdmin, setWithAdmin] = useState(false);
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
    mutationFn: async (submitted: EditValues) => {
      const values: EditValues = {};
      if (!record || changedFields.current.has("name")) values.name = submitted.name ?? "";
      if (!record || changedFields.current.has("code")) values.code = submitted.code ?? "";
      if (!record || changedFields.current.has("type")) values.type = submitted.type ?? "";
      if (!record || changedFields.current.has("status")) values.status = submitted.status ?? "";
      if (!record || changedFields.current.has("auditStatus"))
        values.auditStatus = submitted.auditStatus ?? "APPROVED";
      if (!record || changedFields.current.has("planId")) values.planId = submitted.planId ?? 0;
      if (!record || changedFields.current.has("expiredAt"))
        values.expiredAt = submitted.expiredAt
          ? toRfc3339DateTime(String(submitted.expiredAt))
          : null;
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
  const busy = loading || mutation.isPending;
  const submit = async () => {
    if (disabled || busy) return;
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
        <Form.Item
          field="name"
          label="租户名称"
          rules={[{ required: true, message: "请填写租户名称" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item
          field="code"
          label="租户编码"
          rules={[{ required: true, message: "请填写租户编码" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item field="type" label="租户类型">
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
        <Form.Item field="status" label="状态" rules={[{ required: true, message: "请填写状态" }]}>
          <Select
            options={[
              { value: "ON", label: "启用" },
              { value: "OFF", label: "禁用" },
              { value: "FREEZE", label: "冻结" },
              { value: "EXPIRED", label: "过期" },
            ]}
          />
        </Form.Item>
        <Form.Item
          field="auditStatus"
          label="审核状态"
          rules={[{ required: true, message: "请选择审核状态" }]}
        >
          <Select
            options={[
              { value: "PENDING", label: "待审核" },
              { value: "APPROVED", label: "已通过" },
              { value: "REJECTED", label: "已拒绝" },
            ]}
          />
        </Form.Item>
        <Form.Item field="planId" label="订阅套餐">
          <PlanSelect />
        </Form.Item>
        <Form.Item
          field="expiredAt"
          label="到期时间"
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
          <DatePicker
            showTime
            format="YYYY-MM-DD HH:mm:ss"
            allowClear
            placeholder="请选择到期时间，留空为永久"
            className="w-full"
          />
        </Form.Item>
        <Form.Item field="remark" label="备注">
          <Input.TextArea />
        </Form.Item>
        {!record && (
          <>
            <Form.Item label="同时创建管理员">
              <Switch checked={withAdmin} onChange={setWithAdmin} disabled={mutation.isPending} />
            </Form.Item>
            {withAdmin && (
              <>
                <Form.Item
                  field="adminUsername"
                  label="管理员用户名"
                  rules={[{ required: true, message: "请输入管理员用户名" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  field="adminEmail"
                  label="管理员邮箱"
                  rules={[{ type: "email", message: "请输入有效的管理员邮箱地址" }]}
                >
                  <Input />
                </Form.Item>
                <Form.Item
                  field="adminPassword"
                  label="管理员密码"
                  rules={[{ required: true, message: "请输入管理员密码" }]}
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
