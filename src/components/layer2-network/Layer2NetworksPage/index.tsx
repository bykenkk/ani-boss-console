import { Button, Input, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  listPlatformNetworks,
  platformNetworkKeys,
  type PlatformNetwork,
} from "@/api/platform-networks";
import { ListDataTable, ListPageFrame, type ListColumn } from "@/components/common";
import { PlatformNetworkStatus } from "@/components/network/PlatformNetworkStatus";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { useLayer2NetworkActions } from "@/hooks/useLayer2NetworkActions";
import { Layer2NetworkCreateModal } from "../Layer2NetworkCreateModal";
const kind = "vlan-networks";
const columns: ListColumn<PlatformNetwork>[] = [
  { key: "name", title: "名称", dataIndex: "name", width: 200, fixed: "left", ellipsis: true },
  {
    key: "state",
    title: "状态",
    width: 120,
    render: (_, item) => <PlatformNetworkStatus state={item.state} />,
  },
  { key: "cluster", title: "集群 ID", dataIndex: "cluster_id", width: 180, ellipsis: true },
  { key: "nic", title: "网卡", dataIndex: "vlan.device_name", width: 140 },
  { key: "vlan", title: "VLAN ID", dataIndex: "vlan.vlan_id", width: 130 },
  {
    key: "switch",
    title: "虚拟交换机 ID",
    dataIndex: "vlan.virtual_switch_id",
    width: 220,
    ellipsis: true,
  },
];
export function Layer2NetworksPage() {
  const [keyword, setKeyword] = useState("");
  const [creating, setCreating] = useState(false);
  // TODO(pagination-migration): 后端完成页码契约后改用 useListPagination。
  const paging = useCursorPagination(keyword);
  const params = { name: keyword || undefined, cursor: paging.cursor, limit: paging.limit };
  const query = useQuery({
    queryKey: platformNetworkKeys.list(kind, params),
    queryFn: ({ signal }) => listPlatformNetworks(kind, params, signal),
    meta: { errorNotification: { id: "vlan-networks-list", action: "二层网络列表加载" } },
  });
  const { actions } = useLayer2NetworkActions(paging.resetPagination);
  return (
    <>
      <ListPageFrame
        header={{ title: "二层网络", subtitle: "管理二层网络配置与资源关联。" }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setCreating(true)}>
              创建二层网络
            </Button>
          ),
          filters: (
            <Space>
              <Input.Search
                placeholder="搜索二层网络名称"
                aria-label="搜索二层网络名称"
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
          tableLabel="二层网络"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          rowActions={actions}
          pagination={paging.getPagination(query.data?.next_cursor, query.isFetching)}
        />
      </ListPageFrame>
      {creating && (
        <Layer2NetworkCreateModal
          onCancel={() => setCreating(false)}
          onSuccess={() => {
            setCreating(false);
            paging.resetPagination();
          }}
        />
      )}
    </>
  );
}
