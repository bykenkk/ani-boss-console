import { useQuery } from "@tanstack/react-query";
import { listNodeInterfaces, type NodeInterface } from "@/api/platform-networks";
import { DataTable, type ListColumn } from "@/components/common";
interface NodeInterfaceInventoryProps {
  clusterId: string;
  switchId?: string;
}
const columns: ListColumn<NodeInterface>[] = [
  { key: "node", title: "节点", dataIndex: "node_name", width: 200, ellipsis: true },
  { key: "name", title: "网卡", dataIndex: "name", width: 140 },
  {
    key: "selectable",
    title: "可用性",
    width: 120,
    render: (_, item) => (item.selectable ? "可选" : "不可选"),
  },
  {
    key: "reason",
    title: "原因",
    width: 220,
    render: (_, item) => (item.unavailable_reasons ?? []).join("、") || "-",
  },
];
export function NodeInterfaceInventory({ clusterId, switchId }: NodeInterfaceInventoryProps) {
  const params = { cluster_id: clusterId, virtual_switch_id: switchId };
  const query = useQuery({
    queryKey: ["node-interfaces", params],
    queryFn: ({ signal }) => listNodeInterfaces(params, signal),
    enabled: Boolean(clusterId),
    meta: { errorNotification: { id: "node-interfaces", action: "网卡清单加载" } },
  });
  return (
    <DataTable
      rowKey={(item) => `${item.node_uid}/${item.name}`}
      columns={columns}
      data={query.data?.items ?? []}
      loading={query.isFetching}
      pagination={false}
    />
  );
}
