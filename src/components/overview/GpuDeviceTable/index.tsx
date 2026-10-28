import type { GpuDevice } from "@/api/accelerator";
import {
  ListDataTable,
  StatusBadge,
  type DataTableSectionHeaderProps,
  type ListColumn,
  type ListPagination,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { deviceKey, formatGpuAmount, getDeviceHealth, type GpuAllocation } from "../gpu-capacity";

interface GpuDeviceTableProps {
  data: GpuDevice[];
  allocations: Map<string, GpuAllocation>;
  loading: boolean;
  pagination: ListPagination;
  header: DataTableSectionHeaderProps;
}

export function GpuDeviceTable({
  data,
  allocations,
  loading,
  pagination,
  header,
}: GpuDeviceTableProps) {
  const allocation = (d: GpuDevice) => allocations.get(deviceKey(d.cluster_id, d.device_id));
  const columns: ListColumn<GpuDevice>[] = [
    { title: "节点", dataIndex: "node.name", width: 140, fixed: "left", ellipsis: true },
    {
      title: "设备 ID / UUID",
      width: 280,
      ellipsis: true,
      render: (_, d) => (
        <div>
          <div>{d.device_id}</div>
          <div className="text-xs text-[var(--color-text-3)]">{d.vendor_device_id}</div>
        </div>
      ),
    },
    { title: "型号", dataIndex: "model_key", width: 200, ellipsis: true },
    {
      title: "物理显存",
      width: 140,
      render: (_, d) =>
        !d.physical_memory_bytes || Number(d.physical_memory_bytes) <= 0
          ? "未知"
          : `${formatGpuAmount(Number(d.physical_memory_bytes) / 1024 ** 3)} GiB`,
    },
    {
      title: "供给模式",
      width: 160,
      render: (_, d) => {
        const a = allocation(d);
        return (
          <div>
            {a?.mode === "WHOLE_EXCLUSIVE" ? "整卡" : a?.mode === "SHARED_FIXED" ? "共享" : "未知"}
            {a?.admission === "ADMISSION_CLOSED" ? (
              <div className="text-xs text-[var(--color-text-3)]">已关闭接单</div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "已分配 / 剩余",
      width: 190,
      render: (_, d) => {
        const a = allocation(d);
        const c = a?.capacity;
        if (!c?.complete || !a?.mode) return "未知";
        if (a.mode === "WHOLE_EXCLUSIVE")
          return `${formatGpuAmount(Number(c.known_committed_units))} / ${formatGpuAmount(Number(c.known_free_units))} 张`;
        const budget = Number(c.safe_memory_budget_mib),
          used = Number(c.committed_memory_mib);
        return used > budget
          ? "未知"
          : `${formatGpuAmount(used / 1024)} / ${formatGpuAmount((budget - used) / 1024)} GiB`;
      },
    },
    {
      title: "健康状态",
      width: 120,
      render: (_, d) => {
        const health = getDeviceHealth(d);
        return (
          <StatusBadge
            value={health === "healthy" ? "健康" : health === "unhealthy" ? "不健康" : "观测未知"}
            tone={health === "healthy" ? "success" : health === "unhealthy" ? "danger" : "default"}
          />
        );
      },
    },
    { title: "观测时间", width: 180, render: (_, d) => formatDateTime(d.observation?.observed_at) },
  ];
  return (
    <ListDataTable
      rowKey="device_id"
      header={header}
      data={data}
      columns={columns}
      pagination={pagination}
      loading={loading}
      tableLabel="GPU 设备列表"
      emptyText="暂无 GPU 设备"
      scroll={{ x: 1410 }}
    />
  );
}
