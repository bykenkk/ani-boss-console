import { Alert, Form, Modal } from "@arco-design/web-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import {
  planKeys,
  createPlan,
  updatePlan,
  getPlan,
  getPlanByExactName,
  getPlanModulesForEditing,
  savePlanModules,
  type Plan,
  type PlanModuleCode,
  type UpdatePlanInput,
} from "@/api/plans";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";
import { PlanFields } from "@/components/tenant/PlanFields";

interface PlanEditModalProps {
  record?: Plan;
  onCancel: () => void;
  onSuccess: () => void;
}

interface PlanEditFormValues {
  name: string;
  version?: Plan["version"];
  expiryPolicy?: Plan["expiryPolicy"];
  dataRetentionDays?: number;
  description?: string;
  remark?: string;
  modules?: PlanModuleCode[];
}

interface PlanSaveCheckpoint {
  id?: number;
  createdName?: string;
  values?: UpdatePlanInput;
}

function planInput(values: PlanEditFormValues): UpdatePlanInput {
  return {
    name: values.name,
    version: values.version,
    expiryPolicy: values.expiryPolicy,
    dataRetentionDays: values.dataRetentionDays ?? 0,
    description: values.description ?? "",
    remark: values.remark ?? "",
  };
}

export function PlanEditModal({ record, onCancel, onSuccess }: PlanEditModalProps) {
  const [form] = Form.useForm<PlanEditFormValues>();
  const client = useQueryClient();
  const checkpoint = useRef<PlanSaveCheckpoint>({ id: record?.id });
  const initialized = useRef(!record);
  const submitLock = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [savePhase, setSavePhase] = useState<"plan" | "lookup" | "modules">("plan");
  const initial = useMemo<PlanEditFormValues>(
    () => ({
      name: record?.name ?? "",
      version: record ? record.version : "STANDARD",
      expiryPolicy: record ? record.expiryPolicy : "READONLY",
      dataRetentionDays: record ? record.dataRetentionDays : 30,
      description: record?.description,
      remark: record?.remark,
      modules: [],
    }),
    [record],
  );
  const detail = useQuery({
    queryKey: planKeys.detail(record?.id ?? 0),
    queryFn: ({ signal }) => getPlan(record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: {
        id: withId("management-detail", "plans", record?.id),
        action: "详情加载",
      },
    },
  });
  const modules = useQuery({
    queryKey: planKeys.editableModules(record?.id ?? 0),
    queryFn: ({ signal }) => getPlanModulesForEditing(record!.id, signal),
    enabled: !!record,
    meta: {
      errorNotification: { id: withId("plan-modules", record?.id), action: "可用模块加载" },
    },
  });
  useEffect(() => {
    if (
      initialized.current ||
      !detail.data ||
      detail.isFetching ||
      !modules.data ||
      modules.isFetching
    )
      return;
    const values: PlanEditFormValues = {
      name: detail.data.name ?? "",
      version: detail.data.version,
      expiryPolicy: detail.data.expiryPolicy,
      dataRetentionDays: detail.data.dataRetentionDays,
      description: detail.data.description,
      remark: detail.data.remark,
      modules: [...new Set(modules.data.map((item) => item.module!))],
    };
    form.setFieldsValue(values);
    checkpoint.current.values = planInput(values);
    initialized.current = true;
  }, [detail.isFetching, detail.data, modules.isFetching, modules.data, form]);

  const mutation = useMutation({
    mutationFn: async (submitted: PlanEditFormValues) => {
      setSavePhase("plan");
      const values = planInput(submitted);
      const saved = checkpoint.current;
      // FIXME(plan-module-save): 一个表单一次确认，暂先保存套餐，再独立保存模块。
      // 创建不返回 ID，成功后按原始唯一名称回查；立即记录已成功步骤，重试不重复创建。
      // 待后端支持返回 ID 的组合创建及模块原子保存后合并，当前失败保留已完成结果。
      if (saved.id === undefined && saved.createdName === undefined) {
        await createPlan({ ...values, name: submitted.name });
        saved.createdName = submitted.name;
        saved.values = values;
      }
      if (saved.id === undefined) {
        setSavePhase("lookup");
        const created = await getPlanByExactName(saved.createdName!);
        saved.id = created.id;
      }

      setSavePhase("plan");
      const changed: UpdatePlanInput = {};
      if (values.name !== saved.values?.name) changed.name = values.name;
      if (values.version !== saved.values?.version) changed.version = values.version;
      if (values.expiryPolicy !== saved.values?.expiryPolicy)
        changed.expiryPolicy = values.expiryPolicy;
      if (values.dataRetentionDays !== saved.values?.dataRetentionDays)
        changed.dataRetentionDays = values.dataRetentionDays;
      if (values.description !== saved.values?.description)
        changed.description = values.description;
      if (values.remark !== saved.values?.remark) changed.remark = values.remark;
      if (Object.keys(changed).length) {
        await updatePlan(saved.id, changed);
        saved.values = values;
      }
      setSavePhase("modules");
      await savePlanModules(saved.id, submitted.modules ?? []);
    },
    meta: {
      feedback: {
        channel: "message",
        action: "保存套餐",
        successText: "套餐及可用模块已保存",
        errorFallback: "保存未完成，请重试",
      },
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: planKeys.all });
      onSuccess();
    },
    onError: async () => {
      await client.invalidateQueries({ queryKey: planKeys.all });
    },
  });
  const ready =
    !record || (!!detail.data && !!modules.data && !detail.isFetching && !modules.isFetching);
  const busy = submitting || mutation.isPending;
  const submit = async () => {
    if (!ready || !initialized.current || submitLock.current) return;
    submitLock.current = true;
    setSubmitting(true);
    try {
      const submitted = await validateForm<PlanEditFormValues>(form);
      await mutation.mutateAsync({ ...submitted, modules: [...(submitted.modules ?? [])] });
    } catch {
      /* 校验与保存错误由统一反馈入口处理 */
    } finally {
      submitLock.current = false;
      setSubmitting(false);
    }
  };
  return (
    <Modal
      visible
      title={record ? "编辑套餐" : "新建套餐"}
      onCancel={onCancel}
      onOk={submit}
      okText="保存"
      confirmLoading={busy}
      okButtonProps={{ disabled: !ready }}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      escToExit={!busy}
      style={{ width: 680 }}
    >
      {mutation.isError && savePhase !== "plan" && (
        <Alert
          className="mb-5"
          type="warning"
          content={
            savePhase === "lookup"
              ? "套餐已创建，保存尚未完成。再次保存将继续处理。"
              : "套餐信息已保存，可用模块可能已部分更新。再次保存将继续处理。"
          }
        />
      )}
      <Form form={form} disabled={!ready || busy} layout="vertical" initialValues={initial}>
        <PlanFields />
      </Form>
    </Modal>
  );
}
