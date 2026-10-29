import { Form, Input, Radio, type FormInstance } from "@arco-design/web-react";
import type { NetworkCreateFormValues } from "../NetworkCreateModal";
import { getNetworkSegmentErrors } from "../validation";

interface NetworkSegmentFieldsProps {
  form: FormInstance<NetworkCreateFormValues>;
}

const rangeFields = [
  { field: "startIp", label: "起始 IP", placeholder: "192.168.1.2" },
  { field: "endIp", label: "结束 IP", placeholder: "192.168.1.100" },
  { field: "netmask", label: "子网掩码", placeholder: "255.255.255.0" },
] as const;
const gatewayFields = [
  { field: "switchGateway", label: "交换机网关" },
  { field: "platformGateway", label: "云平台网关" },
] as const;
const segmentDependencies = ["addressMode", "startIp", "endIp", "netmask", "cidr"];

export function NetworkSegmentFields({ form }: NetworkSegmentFieldsProps) {
  return (
    <>
      <Form.Item label="网络地址类型" required>
        <Radio.Group type="button" value="ipv4" options={[{ label: "IPv4", value: "ipv4" }]} />
      </Form.Item>
      <Form.Item field="addressMode" label="添加方式" required>
        <Radio.Group
          type="button"
          options={[
            { label: "IP 范围", value: "range" },
            { label: "CIDR", value: "cidr" },
          ]}
        />
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(previous, current) => previous.addressMode !== current.addressMode}
      >
        {(values) => (
          <>
            <div hidden={values.addressMode !== "range"}>
              {rangeFields.map(({ field, label, placeholder }) => (
                <Form.Item
                  key={field}
                  field={field}
                  label={label}
                  required={values.addressMode === "range"}
                  dependencies={segmentDependencies.filter((dependency) => dependency !== field)}
                  rules={[
                    {
                      validator: (_, callback) =>
                        callback(getNetworkSegmentErrors(form.getFieldsValue())[field]),
                    },
                  ]}
                >
                  <Input placeholder={placeholder} />
                </Form.Item>
              ))}
            </div>
            <div hidden={values.addressMode !== "cidr"}>
              <Form.Item
                field="cidr"
                label="IPv4 CIDR"
                required={values.addressMode === "cidr"}
                rules={[
                  {
                    validator: (_, callback) =>
                      callback(getNetworkSegmentErrors(form.getFieldsValue()).cidr),
                  },
                ]}
              >
                <Input placeholder="192.168.1.0/24" />
              </Form.Item>
            </div>
          </>
        )}
      </Form.Item>
      {gatewayFields.map(({ field, label }) => (
        <Form.Item
          key={field}
          field={field}
          label={label}
          required
          dependencies={segmentDependencies}
          rules={[
            {
              validator: (_, callback) =>
                callback(getNetworkSegmentErrors(form.getFieldsValue())[field]),
            },
          ]}
        >
          <Input placeholder="192.168.1.1" />
        </Form.Item>
      ))}
      <Form.Item
        field="reservedIps"
        label="预留 IP"
        dependencies={segmentDependencies}
        extra="支持单个 IP、IP 范围（192.168.1.10-192.168.1.20），多个条目用英文逗号分隔。"
        rules={[
          {
            validator: (_, callback) =>
              callback(getNetworkSegmentErrors(form.getFieldsValue()).reservedIps),
          },
        ]}
      >
        <Input.TextArea
          placeholder="192.168.1.10,192.168.1.20-192.168.1.30"
          autoSize={{ minRows: 2, maxRows: 4 }}
        />
      </Form.Item>
    </>
  );
}
