import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuBindings, type GpuBinding } from "@/api/accelerator";
import {
  TableSectionFrame,
  ListDataTable,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { withId } from "@/lib/id";
import type { GpuAccess } from "../GpuResourcesPage/types";
const columns: ListColumn<GpuBinding>[] = [
  {
    title: "绑定 ID",
    dataIndex: "binding.binding_id",
    width: 220,
    ellipsis: true,
  },
  {
    title: "容器名称",
    dataIndex: "binding.container_name",
    width: 180,
    ellipsis: true,
  },
  { title: "物理设备 ID", dataIndex: "physical_device_id", width: 220, ellipsis: true },
  {
    title: "分配状态",
    width: 160,
    ellipsis: true,
    render: (_, item) => (
      <StatusBadge
        value={item.binding?.state}
        tone={item.binding?.state === "ALLOCATION_UNKNOWN" ? "warning" : "default"}
      />
    ),
  },
  {
    title: "显存（MiB）",
    dataIndex: "binding.memory_mib",
    width: 140,
    ellipsis: true,
  },
  {
    title: "核心比例（%）",
    dataIndex: "binding.core_limit_percent",
    width: 140,
    ellipsis: true,
  },
  { title: "Pod 命名空间", dataIndex: "pod_namespace", width: 180, ellipsis: true },
  { title: "Pod 名称", dataIndex: "pod_name", width: 200, ellipsis: true },
  { title: "Pod UID", dataIndex: "pod_uid", width: 220, ellipsis: true },
  {
    title: "租户 ID",
    dataIndex: "tenant_id",
    width: 220,
    ellipsis: true,
  },
  { title: "所属服务", dataIndex: "owner_service", width: 180, ellipsis: true },
];
export function GpuBindings({ clusterId, access }: { clusterId: string; access: GpuAccess }) {
  const cursor = useCursorPagination(clusterId);
  const params = {
    cluster_id: clusterId,
    page_size: cursor.limit,
    page_token: cursor.cursor,
  };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "bindings", params],
    queryFn: ({ signal }) => listGpuBindings(params, signal),
    enabled: Boolean(clusterId) && access.can("accelerator:binding:admin-list"),
    meta: {
      errorNotification: {
        id: withId("gpu-bindings", clusterId),
        action: "GPU 实际绑定加载",
      },
    },
  });
  return (
    <TableSectionFrame>
      <ListDataTable
        rowKey={(item) => item.binding?.binding_id ?? `${item.physical_device_id}/${item.pod_uid}`}
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isFetching}
        pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
        tableLabel="GPU 实际绑定"
        emptyText="暂无 GPU 绑定"
      />
    </TableSectionFrame>
  );
}
