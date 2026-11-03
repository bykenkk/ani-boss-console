import { Form, Input } from "@arco-design/web-react";
import type { FormInstance } from "@arco-design/web-react/es/Form";
import { parseCidr, parseIpv4 } from "@/components/network/validation";
import type { BasicNetworkCreateFormValues } from "..";

interface BasicNetworkAddressFieldsProps {
  form: FormInstance<BasicNetworkCreateFormValues>;
}

export function BasicNetworkAddressFields({ form }: BasicNetworkAddressFieldsProps) {
  return (
    <>
      <Form.Item
        field="cidr"
        label="IPv4 CIDR"
        rules={[
          { required: true, message: "请输入 IPv4 CIDR" },
          {
            validator: (value, callback) =>
              callback(parseCidr(value ?? "") ? undefined : "请输入有效的 IPv4 网络 CIDR"),
          },
        ]}
      >
        <Input placeholder="例如 10.250.0.0/24" />
      </Form.Item>
      <Form.Item
        field="gateway"
        label="云平台网关 IP（OVN）"
        rules={[
          { required: true, message: "请输入云平台网关 IP" },
          {
            validator: (value, callback) => {
              const address = parseIpv4(value ?? "");
              const cidr = parseCidr(form.getFieldValue("cidr") ?? "");
              callback(
                address === undefined || (cidr && (address <= cidr.start || address >= cidr.end))
                  ? "请输入 CIDR 内的有效网关地址"
                  : undefined,
              );
            },
          },
        ]}
      >
        <Input placeholder="例如 10.250.0.1" />
      </Form.Item>
      <Form.Item
        field="excludedIps"
        label="预留 IP"
        extra="可选。每行填写一个 IPv4 地址或起止范围，例如 10.250.0.10..10.250.0.20；网关会自动预留。"
        rules={[
          {
            validator: (value, callback) => {
              const cidr = parseCidr(form.getFieldValue("cidr") ?? "");
              const invalid = (value ?? "")
                .split(/[,\n]/)
                .filter((entry: string) => entry.trim())
                .some((entry: string) => {
                  const parts = entry.trim().split("..");
                  const start = parseIpv4(parts[0]);
                  const end = parts.length === 1 ? start : parseIpv4(parts[1]);
                  return (
                    parts.length > 2 ||
                    start === undefined ||
                    end === undefined ||
                    start > end ||
                    Boolean(cidr && (start < cidr.start || end > cidr.end))
                  );
                });
              callback(invalid ? "预留 IP 必须是 CIDR 内的有效地址或起止范围" : undefined);
            },
          },
        ]}
      >
        <Input.TextArea placeholder="每行一个地址或范围" />
      </Form.Item>
    </>
  );
}
