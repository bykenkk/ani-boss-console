import { Form, Input } from "@arco-design/web-react";
import { NetworkResourceSelect } from "@/components/network/NetworkResourceSelect";
import { parseCidr, parseIpv4 } from "@/components/network/validation";
// TODO(ip-address-component): 网关与排除地址改用独立的 IP 地址选择组件，统一地址选择及校验。
// TODO(cidr-input-component): CIDR 改用独立的 CIDR 输入组件，统一网络地址、前缀长度及校验。
export function PublicNetworkAddressFields() {
  return (
    <>
      <Form.Item
        field="vlanId"
        label="二层网络"
        rules={[{ required: true, message: "请选择二层网络" }]}
      >
        <NetworkResourceSelect kind="vlan" />
      </Form.Item>
      <Form.Item
        field="cidr"
        label="IPv4 CIDR"
        rules={[
          { required: true, message: "请输入 CIDR" },
          {
            validator: (value, callback) =>
              callback(parseCidr(value ?? "") ? undefined : "请输入有效的 IPv4 网络 CIDR"),
          },
        ]}
      >
        <Input placeholder="例如 192.168.23.0/24" />
      </Form.Item>
      <Form.Item
        field="upstreamGateway"
        label="交换机网关"
        rules={[
          { required: true, message: "请输入交换机网关" },
          {
            validator: (value, callback) =>
              callback(parseIpv4(value ?? "") !== undefined ? undefined : "请输入有效的 IPv4 地址"),
          },
        ]}
      >
        <Input placeholder="请输入交换机网关" />
      </Form.Item>
      <Form.Item
        field="ovnGateway"
        label="云平台网关"
        rules={[
          { required: true, message: "请输入云平台网关" },
          {
            validator: (value, callback) =>
              callback(parseIpv4(value ?? "") !== undefined ? undefined : "请输入有效的 IPv4 地址"),
          },
        ]}
      >
        <Input placeholder="请输入云平台网关" />
      </Form.Item>
      <Form.Item
        field="excludedIps"
        label="排除地址"
        extra="多个 IPv4 地址使用英文逗号分隔；地址冲突由服务端核验。"
        rules={[
          {
            validator: (value, callback) =>
              callback(
                !value || value.split(",").every((ip: string) => parseIpv4(ip) !== undefined)
                  ? undefined
                  : "请输入有效的 IPv4 地址，多个地址用英文逗号分隔",
              ),
          },
        ]}
      >
        <Input.TextArea placeholder="例如 192.168.23.10,192.168.23.20" />
      </Form.Item>
    </>
  );
}
