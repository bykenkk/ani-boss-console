import { Button, Input, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listPlatformNetworks,
  platformNetworkKeys,
  type PlatformNetwork,
} from "@/api/platform-networks";
import { ListDataTable, ListPageFrame, StatusBadge, type ListColumn } from "@/components/common";
import { PlatformNetworkStatus } from "@/components/network/PlatformNetworkStatus";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { usePublicNetworkActions } from "@/hooks/usePublicNetworkActions";
import { PublicNetworkCreateModal } from "../PublicNetworkCreateModal";
import { PlatformEgressModal } from "../PlatformEgressModal";
const kind = "public-address-pools";
const columns: ListColumn<PlatformNetwork>[] = [
  { key: "name", title: "名称", dataIndex: "name", width: 200, fixed: "left", ellipsis: true },
  {
    key: "state",
    title: "状态",
    width: 120,
    render: (_, item) => <PlatformNetworkStatus state={item.state} />,
  },
  { key: "cidr", title: "IPv4 CIDR", dataIndex: "pool.cidr", width: 180 },
  { key: "mode", title: "模式", dataIndex: "pool.mode", width: 120 },
  {
    key: "default",
    title: "默认公网池",
    width: 120,
    render: (_, item) =>
      item.pool ? (
        <StatusBadge
          value={item.pool.is_default ? "是" : "否"}
          tone={item.pool.is_default ? "success" : "default"}
        />
      ) : (
        "-"
      ),
  },
  {
    key: "allocation",
    title: "地址分配",
    width: 120,
    render: (_, item) => (item.pool ? (item.pool.allocation_enabled ? "开启" : "关闭") : "-"),
  },
  {
    key: "vlan",
    title: "二层网络 ID",
    dataIndex: "pool.vlan_network_id",
    width: 220,
    ellipsis: true,
  },
];
export function PublicNetworksPage() {
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  const [configuringEgress, setConfiguringEgress] = useState(false);
  // TODO(pagination-migration): 后端完成页码契约后改用 useListPagination。
  const paging = useCursorPagination(keyword);
  const params = { name: keyword || undefined, cursor: paging.cursor, limit: paging.limit };
  const query = useQuery({
    queryKey: platformNetworkKeys.list(kind, params),
    queryFn: ({ signal }) => listPlatformNetworks(kind, params, signal),
    meta: { errorNotification: { id: "public-address-pools-list", action: "公有网络列表加载" } },
  });
  const { actions } = usePublicNetworkActions(paging.resetPagination);
  return (
    <>
      <ListPageFrame
        header={{ title: "公有网络", subtitle: "管理公有网络配置与资源关联。" }}
        toolbar={{
          actions: (
            <Space>
              <Button onClick={() => setConfiguringEgress(true)}>平台组件出网</Button>
              <Button type="primary" onClick={() => setCreating(true)}>
                创建公有网络
              </Button>
            </Space>
          ),
          filters: (
            <Space>
              <Input.Search
                placeholder="搜索公有网络名称"
                aria-label="搜索公有网络名称"
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
            </Space>
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
          tableLabel="公有网络"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          rowActions={actions}
          pagination={paging.getPagination(query.data?.next_cursor, query.isFetching)}
        />
      </ListPageFrame>
      {creating && (
        <PublicNetworkCreateModal
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            paging.resetPagination();
          }}
        />
      )}
      {configuringEgress && <PlatformEgressModal onCancel={() => setConfiguringEgress(false)} />}
    </>
  );
}
