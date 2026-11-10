import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuDevices, type GpuDevice } from "@/api/accelerator";
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
const columns: ListColumn<GpuDevice>[] = [
  {
    title: "设备 ID",
    dataIndex: "device_id",
    width: 220,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity id={row.device_id} display="id" idLabel="设备 ID" />,
  },
  {
    title: "设备 UID",
    dataIndex: "device_uid",
    width: 260,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity id={row.device_uid} display="id" idLabel="设备 UID" />,
  },
  {
    title: "节点 / UID",
    dataIndex: "node.name",
    width: 200,
    ellipsis: true,
    render: (_, row) => (
      <ResourceIdentity name={row.node?.name} id={row.node?.uid} idLabel="节点 UID" />
    ),
  },

  { title: "GPU 型号", dataIndex: "model_key", width: 180, ellipsis: true },
  {
    title: "供给组 ID",
    dataIndex: "group_id",
    width: 220,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity id={row.group_id} display="id" idLabel="供给组 ID" />,
  },
  {
    title: "设备类型 / 父设备 UID",
    width: 240,
    render: (_, row) => (
      <ResourceIdentity
        name={
          row.device_kind === "PHYSICAL_DEVICE"
            ? "物理设备"
            : row.device_kind === "FIXED_PARTITION_DEVICE"
              ? "固定切片"
              : "未知"
        }
        id={row.parent_device_uid || undefined}
        idLabel="父设备 UID"
      />
    ),
  },
  { title: "适配器", dataIndex: "adapter_id", width: 150, ellipsis: true },
  { title: "资源键", dataIndex: "resource_key", width: 220, ellipsis: true },
  {
    title: "显存容量（Bytes）",
    width: 180,
    render: (_, row) => row.memory_capacity_bytes ?? "未知",
  },
  { title: "计算单元（CU）", width: 120, render: (_, row) => row.compute_units ?? "未知" },
  { title: "PCI BDF", dataIndex: "pci_bdf", width: 150, ellipsis: true },
  {
    title: "健康状态",
    width: 120,
    ellipsis: true,
    render: (_, device) => <StatusBadge value={device.health} />,
  },
];
interface GpuDevicesProps {
  clusterId: string;
}

export function GpuDevices({ clusterId }: GpuDevicesProps) {
  const cursor = useCursorPagination(clusterId);
  const params = {
    cluster_id: clusterId,
    page_size: cursor.limit,
    page_token: cursor.cursor,
  };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "devices", params],
    queryFn: ({ signal }) => listGpuDevices(params, signal),
    enabled: Boolean(clusterId),
    meta: {
      errorNotification: {
        id: withId("gpu-devices", clusterId),
        action: "GPU 设备库存加载",
      },
    },
  });
  return (
    <>
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
          rowKey="device_id"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
          tableLabel="GPU 设备库存"
          emptyText="暂无 GPU 设备"
        />
      </TableSectionFrame>
    </>
  );
}
