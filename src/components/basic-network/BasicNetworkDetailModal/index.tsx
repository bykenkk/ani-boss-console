import { Descriptions, Modal } from "@arco-design/web-react";
import { ResourceIdentity } from "@/components/common";
import type { PlatformNetwork } from "@/api/platform-networks";
import { PlatformNetworkStatus } from "@/components/network/PlatformNetworkStatus";
import { formatDateTime } from "@/lib/date";

interface BasicNetworkDetailModalProps {
  network: PlatformNetwork;
  onCancel: () => void;
}

export function BasicNetworkDetailModal({ network, onCancel }: BasicNetworkDetailModalProps) {
  const pool = network.intranet_pool;
  return (
    <Modal visible title="基础网络详情" onCancel={onCancel} footer={null} style={{ width: 680 }}>
      <Descriptions
        column={1}
        className="break-all"
        data={[
          { label: "名称 / ID", value: <ResourceIdentity name={network.name} id={network.id} /> },
          { label: "简介", value: network.description || "-" },
          { label: "状态", value: <PlatformNetworkStatus state={network.state} /> },
          { label: "IPv4 CIDR", value: pool?.cidr || "-" },
          { label: "云平台网关 IP（OVN）", value: pool?.ovn_gateway_ip || "-" },
          { label: "预留 IP", value: pool?.excluded_ips.join("、") || "-" },
          { label: "默认基础网络", value: pool?.is_default ? "是" : "否" },
          { label: "地址分配", value: pool?.allocation_enabled ? "开启" : "关闭" },
          { label: "新建 VPC 自动分配 EIP/SNAT", value: pool?.new_vpcs_enabled ? "开启" : "关闭" },
          { label: "观测状态", value: network.observation_stale ? "已过期" : "有效" },
          { label: "最近观测", value: formatDateTime(network.observed_at) },
          { label: "状态说明", value: network.reason_message || network.reason || "-" },
          { label: "创建时间", value: formatDateTime(network.created_at) },
        ]}
      />
    </Modal>
  );
}
