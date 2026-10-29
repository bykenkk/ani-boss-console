import { useRef, useState } from "react";
import { Button, Form, Input, Modal, Radio, Space, Switch } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  createComputePreset,
  updateComputePreset,
  computePresetKeys,
  type ComputePreset,
  type ComputePresetInput,
  type ComputePresetChanges,
  type ComputeGpuReference,
} from "@/api/compute-presets";
import { validateForm } from "@/lib/form";
import { ModalSteps } from "@/components/common";
import { showMessage } from "@/lib/feedback";
import { ComputeGpuFields } from "../ComputeGpuFields";
import { ComputePresetSummary } from "../ComputePresetSummary";
const positiveInt64 = {
  validator: (value: string | undefined, callback: (error?: string) => void) => {
    callback(
      !/^[1-9]\d*$/.test(value ?? "") || BigInt(value ?? "0") > 9223372036854775807n
        ? "请输入有效的正整数"
        : undefined,
    );
  },
};
interface ComputePresetEditModalProps {
  record?: ComputePreset;
  onCancel: () => void;
}

export function ComputePresetEditModal({ record, onCancel }: ComputePresetEditModalProps) {
  const [form] = Form.useForm<ComputePresetInput>();
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<ComputePresetInput>();
  const [validating, setValidating] = useState(false);
  const busy = useRef(false);
  const [computeType, setComputeType] = useState<"cpu" | "gpu">(record?.compute_type ?? "cpu");
  const [replaceGpu, setReplaceGpu] = useState(!record?.gpu);
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async (input: { values: ComputePresetInput; changes: ComputePresetChanges }) => {
      if (record) await updateComputePreset({ id: record.id, changes: input.changes });
      else await createComputePreset(input.values);
    },
    meta: {
      feedback: {
        channel: "message",
        action: record ? "计算规格更新" : "计算规格创建",
        successText: record ? "计算规格已更新" : "计算规格已创建",
      },
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: computePresetKeys.all });
      onCancel();
    },
  });
  const pending = validating || mutation.isPending;
  const submit = async () => {
    if (busy.current) return;
    busy.current = true;
    setValidating(true);
    try {
      if (step === 1) {
        await validateForm({
          validate: () => form.validate(["code", "name", "description", "enabled"]),
        });
        setStep(2);
        return;
      }
      const values = await validateForm<ComputePresetInput>(form);
      const input: ComputePresetInput = {
        ...values,
        gpu: values.compute_type === "gpu" ? values.gpu : null,
      };
      if (step === 2) {
        setSummary(input);
        setStep(3);
        return;
      }
      const changes: ComputePresetChanges = {};
      if (record) {
        if (input.name !== record.name) changes.name = input.name;
        if (input.description !== (record.description ?? ""))
          changes.description = input.description;
        if (input.compute_type !== record.compute_type) changes.compute_type = input.compute_type;
        if (input.cpu_millis !== record.cpu_millis) changes.cpu_millis = input.cpu_millis;
        if (input.memory_mib !== record.memory_mib) changes.memory_mib = input.memory_mib;
        if (input.enabled !== record.enabled) changes.enabled = input.enabled;
        if (input.compute_type === "cpu" && record.gpu) changes.gpu = null;
        if (input.compute_type === "gpu" && (replaceGpu || record.compute_type !== "gpu"))
          changes.gpu = input.gpu;
        if (!Object.keys(changes).length) {
          showMessage({ type: "info", content: "没有需要保存的修改" });
          return;
        }
      }
      await mutation.mutateAsync({ values: input, changes });
    } catch {
      const errors = form.getFieldsError();
      if (Object.values(errors).some(Boolean))
        setStep(errors.code || errors.name || errors.description || errors.enabled ? 1 : 2);
    } finally {
      busy.current = false;
      setValidating(false);
    }
  };
  return (
    <Modal
      visible
      title={record ? "编辑计算规格" : "创建计算规格"}
      onCancel={() => {
        if (!pending) onCancel();
      }}
      closable={!pending}
      escToExit={!pending}
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
          <Button type="primary" loading={pending} onClick={() => void submit()}>
            {step === 3 ? (record ? "确认保存" : "确认创建") : "下一步"}
          </Button>
        </Space>
      }
    >
      <ModalSteps current={step} titles={["基本信息", "规格参数", "摘要信息"]} />
      <Form
        form={form}
        layout="vertical"
        disabled={pending}
        initialValues={
          record
            ? {
                code: record.code,
                name: record.name,
                description: record.description ?? "",
                compute_type: record.compute_type,
                cpu_millis: record.cpu_millis,
                memory_mib: record.memory_mib,
                enabled: record.enabled,
                gpu: record.gpu
                  ? {
                      profile_id: record.gpu.profile_id,
                      profile_version: record.gpu.profile_version,
                      devices_per_instance: record.gpu.devices_per_instance,
                    }
                  : undefined,
              }
            : {
                description: "",
                compute_type: "cpu",
                cpu_millis: "1000",
                memory_mib: "1024",
                enabled: true,
              }
        }
      >
        <div hidden={step !== 1}>
          <Form.Item field="code" label="规格编码" rules={[{ required: true, match: /\S/ }]}>
            <Input disabled={Boolean(record)} />
          </Form.Item>
          <Form.Item field="name" label="规格名称" rules={[{ required: true, match: /\S/ }]}>
            <Input />
          </Form.Item>
          <Form.Item field="description" label="描述">
            <Input.TextArea />
          </Form.Item>
          <Form.Item field="enabled" label="启用" triggerPropName="checked">
            <Switch />
          </Form.Item>
        </div>
        <div hidden={step !== 2}>
          <Form.Item field="compute_type" label="规格类型" rules={[{ required: true }]}>
            <Radio.Group
              type="button"
              options={[
                { label: "CPU", value: "cpu" },
                { label: "GPU", value: "gpu" },
              ]}
              onChange={(type: "cpu" | "gpu") => {
                setComputeType(type);
                if (type === "cpu") {
                  form.setFieldsValue({ gpu: undefined });
                  setReplaceGpu(true);
                }
              }}
            />
          </Form.Item>
          <div className="grid grid-cols-2 gap-x-4">
            <Form.Item
              field="cpu_millis"
              label="CPU"
              rules={[{ required: true }, positiveInt64]}
              extra="1000 毫核 = 1 核"
            >
              <Input suffix="毫核" />
            </Form.Item>
            <Form.Item field="memory_mib" label="内存" rules={[{ required: true }, positiveInt64]}>
              <Input suffix="MiB" />
            </Form.Item>
          </div>
          {computeType === "gpu" ? (
            replaceGpu ? (
              <ComputeGpuFields />
            ) : (
              <>
                <Form.Item
                  field="gpu"
                  label="GPU 规格"
                  formatter={(value?: ComputeGpuReference) =>
                    value ? value.profile_id + " / v" + value.profile_version : undefined
                  }
                >
                  <Input readOnly />
                </Form.Item>
                <Form.Item label="每实例 GPU 数量">
                  <Input readOnly value={String(record?.gpu?.devices_per_instance)} />
                </Form.Item>
                <Button
                  className="mb-4"
                  onClick={() => {
                    setReplaceGpu(true);
                    form.setFieldsValue({ gpu: undefined });
                  }}
                >
                  更换 GPU 规格
                </Button>
              </>
            )
          ) : null}
        </div>
      </Form>
      {step === 3 && summary && <ComputePresetSummary values={summary} />}
    </Modal>
  );
}
