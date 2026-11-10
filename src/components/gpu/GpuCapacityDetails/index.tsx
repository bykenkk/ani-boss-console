import { Descriptions } from "@arco-design/web-react";
import type { GpuCapacityDetail, GpuCapacityTotals } from "@/api/accelerator";
import { DataTable, ResourceIdentity, type ListColumn } from "@/components/common";

const columns: ListColumn<GpuCapacityDetail>[] = [
  {
    title: "节点 / UID",
    width: 200,
    render: (_, row) => (
      <ResourceIdentity name={row.node_name} id={row.node_uid} idLabel="节点 UID" />
    ),
  },
  {
    title: "设备 UID",
    width: 220,
    ellipsis: true,
    render: (_, row) => <ResourceIdentity id={row.device_uid} display="id" idLabel="设备 UID" />,
  },
  { title: "单位总量", width: 140, dataIndex: "totals.total_units" },
  { title: "已分配单位", width: 140, dataIndex: "totals.allocated_units" },
  { title: "未分配单位", width: 140, dataIndex: "totals.unallocated_units" },
  { title: "总显存（MiB）", width: 160, dataIndex: "totals.total_memory_mib" },
  { title: "已分配显存（MiB）", width: 180, dataIndex: "totals.allocated_memory_mib" },
  { title: "未分配显存（MiB）", width: 180, dataIndex: "totals.unallocated_memory_mib" },
];
const profileColumns: ListColumn<GpuCapacityDetail>[] = [
  { title: "理论规格份数", width: 160, dataIndex: "nominal_units" },
  { title: "估计可用规格份数", width: 180, dataIndex: "estimated_available_units" },
];

interface GpuCapacityDetailsProps {
  totals?: GpuCapacityTotals;
  details?: GpuCapacityDetail[];
  loading: boolean;
  profileUnits?: boolean;
}

export function GpuCapacityDetails({
  totals,
  details,
  loading,
  profileUnits = false,
}: GpuCapacityDetailsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Descriptions
        data={[
          { label: "单位总量", value: totals?.total_units ?? "-" },
          { label: "已分配单位", value: totals?.allocated_units ?? "-" },
          { label: "未分配单位", value: totals?.unallocated_units ?? "-" },
          { label: "总显存（MiB）", value: totals?.total_memory_mib ?? "-" },
          { label: "已分配显存（MiB）", value: totals?.allocated_memory_mib ?? "-" },
          { label: "未分配显存（MiB）", value: totals?.unallocated_memory_mib ?? "-" },
        ]}
      />
      <DataTable
        rowKey={(row) => JSON.stringify([row.node_uid, row.device_uid])}
        columns={profileUnits ? [...columns, ...profileColumns] : columns}
        data={details ?? []}
        loading={loading}
        pagination={false}
        tableLabel="GPU 容量明细"
      />
    </div>
  );
}
