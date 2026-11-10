import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuBindings, type GpuBinding } from "@/api/accelerator";
import {
  ResourceIdentity,
  TableSectionFrame,
  ListDataTable,
  StatusBadge,
  ToolbarIconButton,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { withId } from "@/lib/id";
const columns: ListColumn<GpuBinding>[] = [
  {
    title: "绑定 ID",
    dataIndex: "binding.binding_id",
    width: 220,
    ellipsis: true,
    render: (_, row) => (
      <ResourceIdentity id={row.binding?.binding_id} display="id" idLabel="绑定 ID" />
    ),
  },
  {
    title: "容器名称",
    dataIndex: "binding.container_name",
    width: 200,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity name={row.binding?.container_name} display="name" />,
  },
  {
    title: "物理设备 ID",
    dataIndex: "physical_device_id",
    width: 220,
    ellipsis: true,
    render: (_, row) => (
      <ResourceIdentity id={row.physical_device_id} display="id" idLabel="设备 ID" />
    ),
  },
  {
    title: "分配状态",
    width: 120,
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
  {
    title: "Pod 命名空间",
    dataIndex: "pod_namespace",
    width: 200,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity name={row.pod_namespace} display="name" />,
  },
  {
    title: "Pod / UID",
    dataIndex: "pod_name",
    width: 200,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity name={row.pod_name} id={row.pod_uid} idLabel="Pod UID" />,
  },

  {
    title: "租户 ID",
    dataIndex: "tenant_id",
    width: 220,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity id={row.tenant_id} display="id" idLabel="租户 ID" />,
  },
  {
    title: "所属服务",
    dataIndex: "owner_service",
    width: 200,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity name={row.owner_service} display="name" />,
  },
];
interface GpuBindingsProps {
  clusterId: string;
}

export function GpuBindings({ clusterId }: GpuBindingsProps) {
  const cursor = useCursorPagination(clusterId);
  const params = {
    cluster_id: clusterId,
    page_size: cursor.limit,
    page_token: cursor.cursor,
  };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "bindings", params],
    queryFn: ({ signal }) => listGpuBindings(params, signal),
    enabled: Boolean(clusterId),
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
        header={{
          extra: (
            <ToolbarIconButton
              label="刷新"
              spinning={query.isFetching}
              disabled={query.isFetching}
              onClick={() => query.refetch()}
            />
          ),
        }}
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
