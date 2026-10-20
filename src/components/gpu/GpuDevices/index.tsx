import { useQuery } from "@tanstack/react-query";
import { acceleratorKeys, listGpuDevices, type GpuDevice } from "@/api/accelerator";
import {
  TableSectionFrame,
  ListDataTable,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import { withId } from "@/lib/id";
import type { GpuAccess } from "../GpuResourcesPage/types";
const columns: ListColumn<GpuDevice>[] = [
  { title: "物理设备 ID", dataIndex: "device_id", width: 220, ellipsis: true },
  { title: "GPU UUID", dataIndex: "vendor_device_id", width: 260, ellipsis: true },
  {
    title: "节点名称",
    dataIndex: "node.name",
    width: 200,
    ellipsis: true,
  },
  { title: "节点 UID", dataIndex: "node.uid", width: 220, ellipsis: true },
  { title: "GPU 型号", dataIndex: "model_key", width: 180, ellipsis: true },
  { title: "供给组 ID", dataIndex: "group_id", width: 220, ellipsis: true },
  { title: "物理显存（Bytes）", dataIndex: "physical_memory_bytes", width: 180, ellipsis: true },
  {
    title: "健康状态",
    width: 120,
    ellipsis: true,
    render: (_, device) => <StatusBadge value={device.health} />,
  },
];
export function GpuDevices({ clusterId, access }: { clusterId: string; access: GpuAccess }) {
  const cursor = useCursorPagination(clusterId);
  const params = {
    cluster_id: clusterId,
    page_size: cursor.limit,
    page_token: cursor.cursor,
  };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "devices", params],
    queryFn: ({ signal }) => listGpuDevices(params, signal),
    enabled: Boolean(clusterId) && access.can("accelerator:device:list"),
    meta: {
      errorNotification: {
        id: withId("gpu-devices", clusterId),
        action: "GPU 物理库存加载",
      },
    },
  });
  return (
    <>
      <TableSectionFrame>
        <ListDataTable
          rowKey="device_id"
          columns={columns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          pagination={cursor.getPagination(query.data?.next_page_token, query.isFetching)}
          tableLabel="GPU 物理库存"
          emptyText="暂无 GPU 物理设备"
        />
      </TableSectionFrame>
    </>
  );
}
