import type { GpuDevice } from "@/api/accelerator";
import {
  ResourceIdentity,
  ListDataTable,
  StatusBadge,
  type SectionHeaderProps,
  type ListColumn,
  type ListPagination,
} from "@/components/common";
import { formatGpuAllocationType, formatGpuCapacityBasis } from "@/components/gpu/capacity";
import { formatDateTime } from "@/lib/date";
import {
  deviceKey,
  formatGpuAmount,
  formatGpuInteger,
  formatGpuMiB,
  formatGpuBytesGiB,
  getDeviceHealth,
  type GpuAllocation,
} from "../gpu-capacity";

interface GpuDeviceTableProps {
  data: GpuDevice[];
  allocations: Map<string, GpuAllocation>;
  loading: boolean;
  pagination: ListPagination;
  header: SectionHeaderProps;
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
    {
      title: "节点 / UID",
      dataIndex: "node.name",
      width: 200,
      fixed: "left",
      ellipsis: true,
      render: (_, row) => (
        <ResourceIdentity name={row.node?.name} id={row.node?.uid} idLabel="节点 UID" />
      ),
    },
    {
      title: "设备 ID",
      dataIndex: "device_id",
      width: 220,
      ellipsis: true,
      render: (_, row) => <ResourceIdentity id={row.device_id} display="id" idLabel="设备 ID" />,
    },
    {
      title: "设备 UID / 父设备 UID",
      dataIndex: "device_uid",
      width: 260,
      ellipsis: true,
      render: (_, row) => (
        <ResourceIdentity
          name={row.device_uid}
          id={row.parent_device_uid || undefined}
          idLabel="父设备 UID"
        />
      ),
    },
    { title: "型号", dataIndex: "model_key", width: 200, ellipsis: true },
    {
      title: "设备类型",
      width: 130,
      render: (_, d) =>
        d.device_kind === "PHYSICAL_DEVICE"
          ? "物理设备"
          : d.device_kind === "FIXED_PARTITION_DEVICE"
            ? "固定切片"
            : "未知",
    },
    {
      title: "显存容量 / CU",
      width: 160,
      render: (_, d) => {
        const memory = d.memory_capacity_bytes;
        return (
          <div>
            <div>{memory === undefined ? "未知" : `${formatGpuBytesGiB(memory)} GiB`}</div>
            <div>CU {formatGpuAmount(d.compute_units)}</div>
          </div>
        );
      },
    },
    {
      title: "分配类型 / 接单",
      width: 180,
      render: (_, d) => {
        const a = allocation(d);
        return (
          <div>
            {a?.resources.length
              ? [
                  ...new Set(a.resources.map((r) => formatGpuAllocationType(r.allocation_type))),
                ].join(" / ")
              : "未知"}
            {a?.admission === "ADMISSION_CLOSED" ? (
              <div className="text-xs text-(--color-text-3)">已关闭接单</div>
            ) : null}
          </div>
        );
      },
    },
    {
      title: "已分配 / 未分配",
      width: 240,
      render: (_, d) => {
        const rows = allocation(d)?.resources ?? [];
        if (!rows.length) return "未知";
        return (
          <div className="flex flex-col gap-2">
            {rows.map((r) => {
              // NODE_RESOURCE is not per-card allocation, even if one card is shown.
              if (r.granularity !== "DEVICE")
                return (
                  <div key={r.resource_key} className="text-xs">
                    {formatGpuCapacityBasis(r.basis)} · 按节点资源类型统计，见供给组容量
                  </div>
                );
              const detail = r.details?.find(
                (row) => row.node_uid === d.node?.uid && row.device_uid === d.device_uid,
              );
              const shared = r.allocation_type === "DYNAMIC_SHARED";
              const allocated = shared
                ? detail?.totals.allocated_memory_mib
                : detail?.totals.allocated_units;
              const free = shared
                ? detail?.totals.unallocated_memory_mib
                : detail?.totals.unallocated_units;
              return (
                <div key={r.resource_key}>
                  {shared ? formatGpuMiB(allocated) : formatGpuInteger(allocated)} /{" "}
                  {shared ? formatGpuMiB(free) : formatGpuInteger(free)}{" "}
                  {shared ? "GiB" : "资源单位"}
                </div>
              );
            })}
          </div>
        );
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
      scroll={{ x: 1900 }}
    />
  );
}
