import { Button, Descriptions, Form, Input, Modal, Space, Steps } from "@arco-design/web-react";
import { useRef, useState } from "react";
import { validateForm } from "@/lib/form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createLayer2Network, platformNetworkKeys } from "@/api/platform-networks";
import { Layer2ConfigurationFields } from "./Layer2ConfigurationFields";

interface Layer2NetworkCreateModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}

export interface Layer2NetworkCreateFormValues {
  name: string;
  description?: string;
  clusterId: string;
  nic: string;
  vlanId: number;
  switchId: string;
}

const stepFields: Array<Array<keyof Layer2NetworkCreateFormValues>> = [
  ["name", "description"],
  ["clusterId", "nic", "vlanId", "switchId"],
];
const steps = ["基本信息", "配置信息", "确认配置"];

export function Layer2NetworkCreateModal({ onCancel, onSuccess }: Layer2NetworkCreateModalProps) {
  const [form] = Form.useForm<Layer2NetworkCreateFormValues>();
  const [step, setStep] = useState(1);
  const [clusterName, setClusterName] = useState("");
  const [summary, setSummary] = useState<Layer2NetworkCreateFormValues>();
  const [validating, setValidating] = useState(false);
  const busy = useRef(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createLayer2Network,
    meta: {
      feedback: {
        channel: "message",
        id: "layer2-network-create",
        action: "创建二层网络",
        successText: "创建已提交",
      },
    },
    onSuccess: async () => {
      // TODO(underlay-task): 创建任务跟踪后续统一接入。
      await queryClient.invalidateQueries({ queryKey: platformNetworkKeys.all("vlan-networks") });
      onSuccess();
    },
  });
  const submitting = validating || mutation.isPending;
  const submit = async () => {
    if (busy.current || mutation.isPending) return;
    busy.current = true;
    try {
      const values = await validateForm({ validate: () => form.validate() });
      await mutation.mutateAsync({
        name: values.name.trim(),
        description: values.description?.trim(),
        cluster_id: values.clusterId.trim(),
        virtual_switch_id: values.switchId,
        device_name: values.nic.trim(),
        vlan_id: values.vlanId,
      });
    } catch {
      /* 校验及请求错误由公共反馈处理。 */
    } finally {
      busy.current = false;
    }
  };

  const advance = async () => {
    if (busy.current || step === 3) return;
    busy.current = true;
    setValidating(true);
    try {
      await validateForm({ validate: () => form.validate(stepFields[step - 1]) });
      if (step === 2) setSummary(await validateForm({ validate: () => form.validate() }));
      setStep(step + 1);
    } catch {
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
      title="创建二层网络"
      visible
      style={{ width: 680 }}
      closable={!submitting}
      escToExit={!submitting}
      onCancel={onCancel}
      footer={
        <Space>
          <Button disabled={submitting} onClick={onCancel}>
            取消
          </Button>
          {step > 1 && (
            <Button disabled={submitting} onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          {step < 3 ? (
            <Button type="primary" loading={validating} onClick={advance}>
              下一步
            </Button>
          ) : (
            <Button type="primary" loading={mutation.isPending} onClick={submit}>
              确认创建
            </Button>
          )}
        </Space>
      }
    >
      <Steps current={step} size="small" className="mb-6">
        {steps.map((label) => (
          <Steps.Step key={label} title={label} />
        ))}
      </Steps>
      <Form
        form={form}
        disabled={mutation.isPending}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (step === 3) submit();
          else advance();
        }}
        layout="vertical"
      >
        <div hidden={step !== 1}>
          <Form.Item
            field="name"
            label="名称"
            rules={[{ required: true, match: /\S/, message: "请输入二层网络名称" }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
          <Form.Item
            field="description"
            label="简介"
            rules={[{ maxLength: 100, message: "简介不能超过 100 字" }]}
          >
            <Input.TextArea
              placeholder="请输入简介"
              maxLength={100}
              showWordLimit
              autoSize={{ minRows: 3, maxRows: 5 }}
            />
          </Form.Item>
        </div>
        <div hidden={step !== 2}>
          <Layer2ConfigurationFields form={form} onClusterNameChange={setClusterName} />
        </div>
      </Form>
      {step === 3 && summary && (
        <Descriptions
          column={1}
          labelStyle={{ width: 140 }}
          className="break-all"
          data={[
            { label: "名称", value: summary.name.trim() },
            { label: "简介", value: summary.description?.trim() || "-" },
            {
              label: "集群",
              value: clusterName,
            },
            { label: "网卡", value: summary.nic.trim() },
            { label: "VLAN ID", value: summary.vlanId },
            {
              label: "虚拟交换机",
              value: summary.switchId,
            },
          ]}
        />
      )}
    </Modal>
  );
}
