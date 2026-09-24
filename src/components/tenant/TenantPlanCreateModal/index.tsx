import { Button, Descriptions, Form, Input, Modal, Space, Steps } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  createTenantPlan,
  fetchTenantQuotaMeta,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  type CreateTenantPlanInput,
} from "@/api/tenant";
import { validateForm } from "@/lib/form";
import { TenantPlanQuotaFields } from "./TenantPlanQuotaFields";

interface TenantPlanCreateModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}
interface PlanForm {
  code: string;
  name: string;
  description?: string;
  limits?: Record<string, number | undefined>;
}

export function TenantPlanCreateModal({ onCancel, onSuccess }: TenantPlanCreateModalProps) {
  const [form] = Form.useForm<PlanForm>();
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<PlanForm>();
  const [validating, setValidating] = useState(false);
  const busy = useRef(false);
  const queryClient = useQueryClient();
  const metaQuery = useQuery({
    queryKey: tenantManagementQueryKeys.quotaMeta,
    queryFn: fetchTenantQuotaMeta,
    meta: {
      errorNotification: {
        id: "tenant-quota-meta",
        action: "配额维度加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const quotaMeta = metaQuery.data || [];
  const mutation = useMutation({
    mutationFn: async (input: CreateTenantPlanInput) => {
      try {
        return await createTenantPlan(input);
      } catch (error) {
        throw new Error(getTenantManagementErrorMessage(error));
      }
    },
    meta: {
      feedback: {
        channel: "message",
        action: "配额策略创建",
        successText: "配额策略草稿已创建",
        errorFallback: "配额策略创建失败，请稍后重试",
      },
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
      onSuccess();
    },
  });
  const pending = validating || mutation.isPending;
  const advance = async () => {
    if (busy.current) return;
    busy.current = true;
    setValidating(true);
    try {
      if (step === 1) {
        await validateForm({ validate: () => form.validate(["code", "name", "description"]) });
        setStep(2);
        return;
      }
      const values = await validateForm({ validate: () => form.validate() });
      if (step === 2) {
        setSummary(values);
        setStep(3);
      } else {
        await mutation.mutateAsync({
          code: values.code.trim(),
          name: values.name.trim(),
          description: values.description?.trim() || "",
          quotaLimits: quotaMeta.map((item) => ({
            resourceType: item.resourceType,
            total: values.limits?.[item.resourceType] ?? item.defaultQuota,
          })),
        });
      }
    } catch {
      // 统一反馈已呈现错误；保留输入，返回有校验错误的步骤。
      const errors = form.getFieldsError();
      if (Object.values(errors).some(Boolean))
        setStep(errors.code || errors.name || errors.description ? 1 : 2);
    } finally {
      busy.current = false;
      setValidating(false);
    }
  };
  return (
    <Modal
      title="新建配额策略"
      visible
      style={{ width: 720 }}
      closable={!pending}
      maskClosable={!pending}
      escToExit={!pending}
      onCancel={() => {
        if (!pending) onCancel();
      }}
      footer={
        <Space>
          <Button disabled={pending} onClick={onCancel}>
            取消
          </Button>
          {step > 1 && (
            <Button disabled={pending} onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          <Button
            type="primary"
            loading={pending}
            disabled={step >= 2 && (metaQuery.isFetching || !quotaMeta.length)}
            onClick={() => void advance()}
          >
            {step === 3 ? "创建草稿" : "下一步"}
          </Button>
        </Space>
      }
    >
      <Steps current={step} size="small" className="mb-6">
        {["名称与编码", "限额配置", "确认创建"].map((title) => (
          <Steps.Step key={title} title={title} />
        ))}
      </Steps>
      <Form form={form} layout="vertical" disabled={pending}>
        <div hidden={step !== 1}>
          <Form.Item
            label="策略名称"
            field="name"
            rules={[{ required: true, match: /\S/, message: "请填写策略名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="策略编码"
            field="code"
            rules={[
              { required: true, message: "请填写策略编码" },
              {
                validator: (value, callback) => {
                  callback(
                    /^[a-z0-9-]{3,40}$/.test(String(value || "").trim())
                      ? undefined
                      : "策略编码需为 3–40 位小写字母、数字或连字符",
                  );
                },
              },
            ]}
          >
            <Input placeholder="例如 plan-qa-full-001" />
          </Form.Item>
          <Form.Item label="说明" field="description">
            <Input.TextArea />
          </Form.Item>
        </div>
        <div hidden={step !== 2}>
          <TenantPlanQuotaFields
            quotaMeta={quotaMeta}
            loading={metaQuery.isFetching}
            onRefresh={() => void metaQuery.refetch()}
          />
        </div>
      </Form>
      {step === 3 && summary && (
        <>
          <Descriptions
            column={1}
            data={[
              { label: "策略名称", value: summary.name.trim() },
              { label: "策略编码", value: summary.code.trim() },
              { label: "说明", value: summary.description?.trim() || "-" },
              { label: "创建后状态", value: "草稿（发布后才可用于开通租户）" },
              ...quotaMeta.map((item) => ({
                label: item.displayName,
                value: `${summary.limits?.[item.resourceType] ?? item.defaultQuota} ${item.unit}`,
              })),
            ]}
          />
        </>
      )}
    </Modal>
  );
}
