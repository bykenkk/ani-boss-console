import { Button, Form, Modal, Space, Steps, Tooltip } from "@arco-design/web-react";
import { useRef, useState } from "react";
import { validateForm } from "@/lib/form";
import { networkDemoNotice, networkWriteUnavailable } from "../constants";
import type { NetworkKind } from "../model";
import { NetworkDnsFields } from "../NetworkDnsFields";
import { NetworkSegmentFields } from "../NetworkSegmentFields";
import { getDnsError, type NetworkAddressMode } from "../validation";
import { NetworkBasicFields } from "./NetworkBasicFields";
import { NetworkConfigurationSummary } from "./NetworkConfigurationSummary";

interface NetworkCreateModalProps {
  kind: NetworkKind;
  onCancel: () => void;
}

export interface NetworkCreateFormValues {
  name: string;
  description?: string;
  vlanEnabled: boolean;
  layer2Id?: string;
  dhcpDisabled: boolean;
  addressMode: NetworkAddressMode;
  startIp?: string;
  endIp?: string;
  netmask?: string;
  cidr?: string;
  switchGateway: string;
  platformGateway: string;
  reservedIps?: string;
  dnsServers: string[];
}

const steps = ["基本信息", "添加网络段", "添加 DNS", "确认配置"];
const stepFields: Array<Array<keyof NetworkCreateFormValues>> = [
  ["name", "description", "vlanEnabled", "layer2Id", "dhcpDisabled"],
  [
    "addressMode",
    "startIp",
    "endIp",
    "netmask",
    "cidr",
    "switchGateway",
    "platformGateway",
    "reservedIps",
  ],
  ["dnsServers"],
];

export function NetworkCreateModal({ kind, onCancel }: NetworkCreateModalProps) {
  const [form] = Form.useForm<NetworkCreateFormValues>();
  const [step, setStep] = useState(1);
  const [summary, setSummary] = useState<NetworkCreateFormValues>();
  const [validating, setValidating] = useState(false);
  const busy = useRef(false);
  const title = kind === "basic" ? "创建基础网络" : "创建公有网络";

  const advance = async () => {
    if (busy.current || step === 4) return;
    busy.current = true;
    setValidating(true);
    try {
      await validateForm({ validate: () => form.validate(stepFields[step - 1]) });
      if (step === 3) {
        const values = await validateForm({ validate: () => form.validate() });
        setSummary(values);
      }
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
      title={title}
      visible
      style={{ width: 680 }}
      closable={!validating}
      escToExit={!validating}
      onCancel={onCancel}
      footer={
        <Space>
          <Button disabled={validating} onClick={onCancel}>
            取消
          </Button>
          {step > 1 && (
            <Button disabled={validating} onClick={() => setStep(step - 1)}>
              上一步
            </Button>
          )}
          {step < 4 ? (
            <Button type="primary" loading={validating} onClick={advance}>
              下一步
            </Button>
          ) : (
            // TODO(network-api): 完成契约核对后启用真实提交；创建任务跟踪按项目约定另行接入。
            <Tooltip content={networkWriteUnavailable}>
              <Button type="primary" disabled>
                确认创建
              </Button>
            </Tooltip>
          )}
        </Space>
      }
    >
      <Steps current={step} size="small" className="mb-6">
        {steps.map((label) => (
          <Steps.Step key={label} title={label} />
        ))}
      </Steps>
      <p className="mb-6 text-[var(--color-text-3)]">{networkDemoNotice}</p>
      <Form
        form={form}
        onSubmitCapture={(event) => {
          event.preventDefault();
          event.stopPropagation();
          advance();
        }}
        layout="vertical"
        initialValues={{
          vlanEnabled: true,
          dhcpDisabled: false,
          addressMode: "range",
          dnsServers: [],
        }}
      >
        <div hidden={step !== 1}>
          <NetworkBasicFields />
        </div>
        <div hidden={step !== 2}>
          <NetworkSegmentFields form={form} />
        </div>
        <div hidden={step !== 3}>
          <Form.Item
            field="dnsServers"
            label="DNS 地址"
            extra="可选。添加多个 IPv4 DNS 地址；无需配置时可以直接进入下一步。"
            rules={[{ validator: (value, callback) => callback(getDnsError(value ?? [])) }]}
          >
            <NetworkDnsFields />
          </Form.Item>
        </div>
      </Form>
      {step === 4 && summary && <NetworkConfigurationSummary values={summary} />}
    </Modal>
  );
}
