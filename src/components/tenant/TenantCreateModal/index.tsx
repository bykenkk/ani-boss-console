import { Button, Descriptions, Form, Modal, Space, Steps } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import {
  createTenant,
  fetchAvailableTenantPlans,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  type CreateTenantInput,
} from "@/api/tenant";
import { validateForm } from "@/lib/form";
import { TenantCreateFields } from "./TenantCreateFields";

interface TenantCreateModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}
const stepFields: Array<Array<keyof CreateTenantInput>> = [
  ["name", "displayName", "contactEmail"],
  ["planId"],
  ["administratorName", "administratorEmail", "administratorPassword"],
];

export function TenantCreateModal({ onCancel, onSuccess }: TenantCreateModalProps) {
  const [form] = Form.useForm<CreateTenantInput>();
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<CreateTenantInput>();
  const [validating, setValidating] = useState(false);
  const busy = useRef(false);
  const queryClient = useQueryClient();
  const plansQuery = useQuery({
    queryKey: tenantManagementQueryKeys.availablePlans,
    queryFn: fetchAvailableTenantPlans,
    meta: {
      errorNotification: {
        id: "tenant-available-plans",
        action: "可用配额策略加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const plans = plansQuery.data || [];
  const mutation = useMutation({
    mutationFn: async (input: CreateTenantInput) => {
      try {
        return await createTenant(input);
      } catch (error) {
        throw new Error(getTenantManagementErrorMessage(error));
      }
    },
    meta: {
      feedback: {
        channel: "message",
        action: "租户开通",
        successText: "租户已开通",
        errorFallback: "租户开通失败，请稍后重试",
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
      if (step < 3) {
        await validateForm({ validate: () => form.validate(stepFields[step - 1]) });
        setStep(step + 1);
        return;
      }
      const values = await validateForm({ validate: () => form.validate() });
      if (step === 3) {
        setSummary(values);
        setStep(4);
      } else {
        await mutation.mutateAsync({
          ...values,
          name: values.name.trim(),
          displayName: values.displayName.trim(),
          contactEmail: values.contactEmail.trim(),
          administratorName: values.administratorName.trim(),
          administratorEmail: values.administratorEmail.trim(),
        });
      }
    } catch {
      // 统一反馈已呈现错误；保留输入，返回有校验错误的步骤。
      const errors = form.getFieldsError();
      const invalidStep = stepFields.findIndex((fields) => fields.some((field) => errors[field]));
      if (invalidStep >= 0) setStep(invalidStep + 1);
    } finally {
      busy.current = false;
      setValidating(false);
    }
  };
  return (
    <Modal
      title="开通租户"
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
            disabled={step >= 2 && (plansQuery.isFetching || !plans.length)}
            onClick={() => void advance()}
          >
            {step === 4 ? "确认开通" : "下一步"}
          </Button>
        </Space>
      }
    >
      <Steps current={step} size="small" className="mb-6">
        {["基础信息", "绑定套餐", "首位管理员", "确认开通"].map((title) => (
          <Steps.Step key={title} title={title} />
        ))}
      </Steps>
      <Form form={form} layout="vertical" disabled={pending}>
        <TenantCreateFields
          step={step}
          plans={plans}
          plansPending={plansQuery.isFetching}
          plansReady={plansQuery.isSuccess}
          onRefresh={() => void plansQuery.refetch()}
        />
      </Form>
      {step === 4 && summary && (
        <Descriptions
          column={1}
          data={[
            { label: "租户标识", value: summary.name.trim() },
            { label: "显示名", value: summary.displayName.trim() },
            { label: "联系邮箱", value: summary.contactEmail.trim() },
            { label: "配额策略", value: plans.find((plan) => plan.id === summary.planId)?.name },
            { label: "策略编码", value: plans.find((plan) => plan.id === summary.planId)?.code },
            { label: "管理员登录用户名", value: summary.administratorName.trim() },
            { label: "管理员邮箱", value: summary.administratorEmail.trim() },
            { label: "管理员初始密码", value: "已设置，不回显" },
          ]}
        />
      )}
    </Modal>
  );
}
