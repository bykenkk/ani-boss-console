import { Descriptions, Modal, Spin } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { eipKeys, getEIP } from "@/api/eips";
import { ResourceIdentity, StatusBadge } from "@/components/common";
import { PlatformNetworkStatus } from "@/components/network/PlatformNetworkStatus";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { eipBindingLabel } from "../model";

interface EIPDetailModalProps {
  id: string;
  onCancel: () => void;
}
export function EIPDetailModal({ id, onCancel }: EIPDetailModalProps) {
  const query = useQuery({
    queryKey: eipKeys.detail(id),
    queryFn: ({ signal }) => getEIP(id, signal),
    meta: { errorNotification: { id: withId("eip-detail", id), action: "弹性 IP 详情加载" } },
  });
  const item = query.data;
  return (
    <Modal visible title="弹性 IP 详情" footer={null} onCancel={onCancel} style={{ width: 840 }}>
      <Spin loading={query.isLoading} className="block!">
        <Descriptions
          column={2}
          data={[
            {
              label: "弹性 IP",
              value: <ResourceIdentity name={item?.name} id={id} idLabel="弹性 IP ID" />,
            },
            { label: "IP 地址", value: item?.address || "-" },
            { label: "状态", value: item ? <PlatformNetworkStatus state={item.state} /> : "-" },
            {
              label: "所属租户",
              value:
                item?.managed_by === "system" && !item.resource_tenant_id ? (
                  "平台系统"
                ) : (
                  <ResourceIdentity
                    name={item?.tenant_name}
                    id={item?.resource_tenant_id}
                    idLabel="租户 ID"
                  />
                ),
            },
            {
              label: "租户 ID",
              value: <ResourceIdentity id={item?.tenant_id} display="id" idLabel="租户 ID" />,
            },
            {
              label: "地址池",
              value: (
                <ResourceIdentity name={item?.pool_name} id={item?.pool_id} idLabel="地址池 ID" />
              ),
            },
            {
              label: "地址类型",
              value:
                item?.scope === "public"
                  ? "公网"
                  : item?.scope === "intranet"
                    ? "基础内网"
                    : item?.scope || "-",
            },
            {
              label: "管理方",
              value:
                item?.managed_by === "system"
                  ? "系统"
                  : item?.managed_by === "tenant"
                    ? "租户"
                    : item?.managed_by || "-",
            },
            { label: "绑定类型", value: item ? eipBindingLabel(item) : "-" },
            {
              label: "绑定资源 ID",
              value: (
                <ResourceIdentity
                  id={item?.binding_target?.id}
                  display="id"
                  idLabel="绑定资源 ID"
                />
              ),
            },
            { label: "绑定状态", value: item?.binding_target?.state || item?.binding_state || "-" },
            {
              label: "观测状态",
              value: item ? (
                <StatusBadge
                  value={item.observation_stale ? "已过期" : "有效"}
                  tone={item.observation_stale ? "warning" : "success"}
                />
              ) : (
                "-"
              ),
            },
            { label: "最近观测", value: formatDateTime(item?.observed_at) },
            { label: "创建时间", value: formatDateTime(item?.created_at) },
            { label: "状态说明", value: item?.reason_message || item?.reason || "-", span: 2 },
            { label: "描述", value: item?.description || "-", span: 2 },
          ]}
        />
      </Spin>
    </Modal>
  );
}
