import { Form, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createPlanQuota,
  planKeys,
  updatePlanQuota,
  type PlanList,
  type PlanQuota,
  type QuotaDefinition,
} from "@/api/plans";
import { QuotaCodeSelect } from "@/components/tenant/QuotaCodeSelect";
import { QuotaValueInput } from "@/components/tenant/QuotaValueInput";
import { showMessage } from "@/lib/feedback";
import { validateForm } from "@/lib/form";

interface PlanQuotaEditModalProps {
  record?: PlanQuota;
  planId: number;
  onCancel: () => void;
  onSuccess: () => void;
}

interface PlanQuotaEditFormValues {
  quotaCode: string;
  quotaValue: string;
}

export function PlanQuotaEditModal({
  record,
  planId,
  onCancel,
  onSuccess,
}: PlanQuotaEditModalProps) {
  const [form] = Form.useForm<PlanQuotaEditFormValues>();
  const quotaCode: string | undefined = Form.useWatch("quotaCode", form);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (submitted: PlanQuotaEditFormValues) => {
      if (!record) {
        await createPlanQuota({
          planId,
          quotaCode: submitted.quotaCode,
          quotaValue: submitted.quotaValue,
        });
        return;
      }
      await updatePlanQuota(record.id, {
        ...(submitted.quotaCode !== record.quotaCode ? { quotaCode: submitted.quotaCode } : {}),
        ...(submitted.quotaValue !== record.quotaValue ? { quotaValue: submitted.quotaValue } : {}),
      });
    },
    meta: { feedback: { channel: "message", action: "保存套餐配额" } },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: planKeys.all });
      onSuccess();
    },
  });
  const submit = async () => {
    if (mutation.isPending) return;
    try {
      const submitted = await validateForm<PlanQuotaEditFormValues>(form);
      if (
        record &&
        submitted.quotaCode === record.quotaCode &&
        submitted.quotaValue === record.quotaValue
      ) {
        showMessage({ type: "info", content: "套餐配额未修改" });
        return;
      }
      mutation.mutate(submitted);
    } catch {
      /* 统一校验入口已反馈 */
    }
  };
  return (
    <Modal
      visible
      title={record ? "编辑套餐配额" : "新建套餐配额"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={mutation.isPending}
      cancelButtonProps={{ disabled: mutation.isPending }}
      closable={!mutation.isPending}
      escToExit={!mutation.isPending}
      style={{ width: 680 }}
    >
      <Form
        form={form}
        disabled={mutation.isPending}
        layout="vertical"
        initialValues={{ quotaCode: record?.quotaCode, quotaValue: record?.quotaValue }}
      >
        <Form.Item
          field="quotaCode"
          label="配额类型"
          extra="选择已登记的配额；已有编码未列出时仍可修改配额值。"
          rules={[
            { required: true, message: "请选择配额类型" },
            {
              validator: (value: unknown, callback: (message?: string) => void) => {
                const catalog = client.getQueryState<PlanList<QuotaDefinition>>(
                  planKeys.quotaDefinitions,
                );
                if (record?.quotaCode && value === record.quotaCode) {
                  callback();
                } else if (catalog?.status !== "success") {
                  callback("配额目录尚未就绪，请稍后重试");
                } else if (!catalog.data?.items?.some((definition) => definition.code === value)) {
                  callback("请选择当前目录中的配额类型");
                } else {
                  callback();
                }
              },
            },
          ]}
        >
          <QuotaCodeSelect disabled={mutation.isPending} />
        </Form.Item>
        <Form.Item
          field="quotaValue"
          label="配额值"
          rules={[
            { required: true, message: "请填写配额值" },
            {
              validator: (value: unknown, callback: (message?: string) => void) => {
                if (
                  typeof value !== "string" ||
                  !/^\d+$/.test(value) ||
                  BigInt(value) > 9223372036854775807n
                ) {
                  callback("请输入 0～9223372036854775807 范围内的整数");
                } else {
                  callback();
                }
              },
            },
          ]}
        >
          <QuotaValueInput quotaCode={quotaCode} disabled={mutation.isPending} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
