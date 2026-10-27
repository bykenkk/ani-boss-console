import { Button, Descriptions, Form, Input, Modal, Space } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { createPublicNetwork, platformNetworkKeys } from "@/api/platform-networks";
import { ModalSteps } from "@/components/common";
import { validateForm } from "@/lib/form";
import { PublicNetworkAddressFields } from "./PublicNetworkAddressFields";
interface PublicNetworkCreateModalProps {
  onCancel: () => void;
  onSuccess: () => void;
}
interface PublicNetworkCreateFormValues {
  name: string;
  description?: string;
  vlanId: string;
  cidr: string;
  upstreamGateway: string;
  ovnGateway: string;
  excludedIps?: string;
}
const stepFields: Array<Array<keyof PublicNetworkCreateFormValues>> = [
  ["name", "description"],
  ["vlanId", "cidr", "upstreamGateway", "ovnGateway", "excludedIps"],
];
export function PublicNetworkCreateModal({ onCancel, onSuccess }: PublicNetworkCreateModalProps) {
  const [form] = Form.useForm<PublicNetworkCreateFormValues>();
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<PublicNetworkCreateFormValues>();
  const [validating, setValidating] = useState(false);
  const busy = useRef(false);
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createPublicNetwork,
    meta: {
      feedback: {
        channel: "message",
        id: "public-network-create",
        action: "创建公有网络",
        successText: "创建已提交",
      },
    },
    onSuccess: async () => {
      // TODO(underlay-task): 创建任务跟踪后续统一接入。
      await queryClient.invalidateQueries({
        queryKey: platformNetworkKeys.all("public-address-pools"),
      });
      onSuccess();
    },
  });
  const advance = async () => {
    if (busy.current || mutation.isPending) return;
    busy.current = true;
    setValidating(true);
    try {
      if (step < 3) {
        await validateForm({ validate: () => form.validate(stepFields[step - 1]) });
        if (step === 2) setSummary(await validateForm({ validate: () => form.validate() }));
        setStep(step + 1);
      } else {
        const values = await validateForm({ validate: () => form.validate() });
        await mutation.mutateAsync({
          name: values.name.trim(),
          description: values.description?.trim(),
          mode: "underlay",
          vlan_network_id: values.vlanId,
          cidr: values.cidr.trim(),
          ovn_gateway_ip: values.ovnGateway.trim(),
          upstream_gateway_ip: values.upstreamGateway.trim(),
          excluded_ips:
            values.excludedIps
              ?.split(",")
              .map((x) => x.trim())
              .filter(Boolean) ?? [],
        });
      }
    } catch {
      /* 表单和请求错误由公共反馈处理。 */
    } finally {
      busy.current = false;
      setValidating(false);
    }
  };
  const submitting = validating || mutation.isPending;
  return (
    <Modal
      visible
      title="创建公有网络"
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
          <Button type="primary" loading={submitting} onClick={advance}>
            {step === 3 ? "确认创建" : "下一步"}
          </Button>
        </Space>
      }
    >
      <ModalSteps current={step} titles={["基本信息", "地址池配置", "确认配置"]} />
      <Form
        form={form}
        layout="vertical"
        disabled={submitting}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          advance();
        }}
      >
        <div hidden={step !== 1}>
          <Form.Item
            field="name"
            label="名称"
            rules={[{ required: true, match: /\S/, message: "请输入名称" }]}
          >
            <Input placeholder="请输入名称" />
          </Form.Item>
          <Form.Item field="description" label="简介">
            <Input.TextArea placeholder="请输入简介" maxLength={100} showWordLimit />
          </Form.Item>
        </div>
        <div hidden={step !== 2}>
          <PublicNetworkAddressFields />
        </div>
      </Form>
      {step === 3 && summary && (
        <Descriptions
          column={1}
          className="break-all"
          data={[
            { label: "名称", value: summary.name },
            { label: "网络模式", value: "Underlay" },
            { label: "二层网络 ID", value: summary.vlanId },
            { label: "IPv4 CIDR", value: summary.cidr },
            { label: "交换机网关", value: summary.upstreamGateway },
            { label: "云平台网关", value: summary.ovnGateway },
            { label: "排除地址", value: summary.excludedIps || "-" },
          ]}
        />
      )}
    </Modal>
  );
}
