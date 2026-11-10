import { Button, Input } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listPlatformNetworks,
  platformNetworkKeys,
  type PlatformNetwork,
} from "@/api/platform-networks";
import {
  ResourceIdentity,
  ListDataTable,
  ListPageFrame,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { PlatformNetworkStatus } from "@/components/network/PlatformNetworkStatus";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useBasicNetworkActions } from "@/hooks/useBasicNetworkActions";
import { BasicNetworkCreateModal } from "../BasicNetworkCreateModal";
import { BasicNetworkDetailModal } from "../BasicNetworkDetailModal";

const kind = "intranet-address-pools";
const columns: ListColumn<PlatformNetwork>[] = [
  {
    key: "name",
    title: "名称 / ID",
    dataIndex: "name",
    width: 200,
    fixed: "left",
    ellipsis: true,
    render: (_, row) => <ResourceIdentity name={row.name} id={row.id} idLabel="资源 ID" />,
  },
  {
    key: "state",
    title: "状态",
    width: 120,
    render: (_, item) => <PlatformNetworkStatus state={item.state} />,
  },
  { key: "cidr", title: "IPv4 CIDR", dataIndex: "intranet_pool.cidr", width: 180 },
  {
    key: "gateway",
    title: "云平台网关 IP（OVN）",
    dataIndex: "intranet_pool.ovn_gateway_ip",
    width: 180,
  },
  {
    key: "default",
    title: "默认基础网络",
    width: 140,
    render: (_, item) => (
      <StatusBadge
        value={item.intranet_pool?.is_default ? "是" : "否"}
        tone={item.intranet_pool?.is_default ? "success" : "default"}
      />
    ),
  },
  {
    key: "allocation",
    title: "地址分配",
    width: 120,
    render: (_, item) => (item.intranet_pool?.allocation_enabled ? "开启" : "关闭"),
  },
  {
    key: "auto-allocation",
    title: "新建 VPC 自动分配",
    width: 180,
    render: (_, item) => (
      <StatusBadge
        value={item.intranet_pool?.new_vpcs_enabled ? "开启" : "关闭"}
        tone={item.intranet_pool?.new_vpcs_enabled ? "success" : "default"}
      />
    ),
  },
  {
    key: "reason",
    title: "状态说明",
    width: 260,
    ellipsis: true,
    render: (_, item) => item.reason_message || item.reason || "-",
  },
];

export function BasicNetworksPage() {
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<PlatformNetwork>();
  // TODO(pagination-migration): 既有 Intranet API 改为 page/pageSize 后迁移，不预取或汇总其他游标页。
  const paging = useCursorPagination(keyword);
  const params = { name: keyword || undefined, cursor: paging.cursor, limit: paging.limit };
  const query = useQuery({
    queryKey: platformNetworkKeys.list(kind, params),
    queryFn: ({ signal }) => listPlatformNetworks(kind, params, signal),
    meta: { errorNotification: { id: "intranet-address-pools-list", action: "基础网络列表加载" } },
  });
  const { actions } = useBasicNetworkActions(paging.resetPagination);
  return (
    <>
      <ListPageFrame
        header={{
          title: "基础网络",
          subtitle: "管理基础网络，自动为租户新建 VPC 分配基础 EIP 和 SNAT。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setCreating(true)}>
              创建基础网络
            </Button>
          ),
          filters: (
            <Input.Search
              placeholder="搜索基础网络名称"
              aria-label="搜索基础网络名称"
              allowClear
              onSearch={(value) => {
                setKeyword(value.trim());
                paging.resetPagination();
              }}
              onClear={() => {
                setKeyword("");
                paging.resetPagination();
              }}
            />
          ),
          refresh: {
            spinning: query.isFetching,
            onClick: () => {
              query.refetch();
            },
          },
        }}
      >
        <ListDataTable
          tableLabel="基础网络"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          rowActions={[{ key: "view", label: "查看", onClick: setViewing }, ...actions]}
          pagination={paging.getPagination(query.data?.next_cursor, query.isFetching)}
        />
      </ListPageFrame>
      {creating && (
        <BasicNetworkCreateModal
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            paging.resetPagination();
          }}
        />
      )}
      {viewing && (
        <BasicNetworkDetailModal
          network={query.data?.items.find((item) => item.id === viewing.id) ?? viewing}
          onCancel={() => setViewing(undefined)}
        />
      )}
    </>
  );
}
