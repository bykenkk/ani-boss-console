import { Descriptions } from "@arco-design/web-react";
import type { NetworkCreateFormValues } from "..";
import { demoLayer2Networks } from "@/components/layer2-network/demo-data";

interface NetworkConfigurationSummaryProps {
  values: NetworkCreateFormValues;
}

export function NetworkConfigurationSummary({ values }: NetworkConfigurationSummaryProps) {
  return (
    <Descriptions
      column={1}
      labelStyle={{ width: 150 }}
      className="break-all"
      data={[
        { label: "名称", value: values.name.trim() },
        { label: "简介", value: values.description?.trim() || "-" },
        { label: "VLAN", value: values.vlanEnabled ? "开启" : "关闭" },
        ...(values.vlanEnabled
          ? [
              {
                label: "二层网络",
                value:
                  demoLayer2Networks.find((network) => network.id === values.layer2Id)?.name ?? "-",
              },
            ]
          : []),
        { label: "DHCP 服务", value: values.dhcpDisabled ? "关闭" : "开启" },
        { label: "网络地址类型", value: "IPv4" },
        { label: "添加方式", value: values.addressMode === "range" ? "IP 范围" : "CIDR" },
        ...(values.addressMode === "range"
          ? [
              { label: "起始 IP", value: values.startIp?.trim() },
              { label: "结束 IP", value: values.endIp?.trim() },
              { label: "子网掩码", value: values.netmask?.trim() },
            ]
          : [{ label: "IPv4 CIDR", value: values.cidr?.trim() }]),
        { label: "交换机网关", value: values.switchGateway.trim() },
        { label: "云平台网关", value: values.platformGateway.trim() },
        { label: "预留 IP", value: values.reservedIps?.trim() || "-" },
        {
          label: "DNS",
          value: values.dnsServers.map((address) => address.trim()).join("、") || "未配置",
        },
      ]}
    />
  );
}
