import type { GpuInventoryDevice, GpuInventoryStatus } from "@/api/gpu-inventory";
import {
  ListDataTable,
  type ListColumn,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/common";

const TABLE_SCROLL_X = 1260;

const statusMeta: Record<GpuInventoryStatus, { label: string; tone: StatusBadgeTone }> = {
  available: { label: "空闲未分配", tone: "success" },
  in_use: { label: "已占用", tone: "info" },
  fault: { label: "故障", tone: "danger" },
  maintenance: { label: "维护中", tone: "warning" },
  unavailable: { label: "不可用", tone: "default" },
};

function formatMemory(memoryTotalMb?: number) {
  if (!memoryTotalMb) return "-";
  const gib = memoryTotalMb / 1024;
  return `${Number.isInteger(gib) ? gib : gib.toFixed(1)} GiB`;
}

function formatProfile(device: GpuInventoryDevice) {
  const mode = device.gpuMode?.trim().toLowerCase();
  if (mode === "vgpu") {
    const shares = device.shares && device.shares > 1 ? `1/${device.shares}` : "vGPU";
    return device.gpuSharingSpec ? `${shares}（${device.gpuSharingSpec}）` : shares;
  }
  return "整卡";
}

const columns: ListColumn<GpuInventoryDevice>[] = [
  {
    title: "节点 / 设备",
    width: 180,
    ellipsis: true,
    render: (_, device) => `${device.nodeName} / GPU-${device.gpuIndex}`,
  },
  { title: "设备 ID", dataIndex: "id", width: 200, ellipsis: true },
  {
    title: "型号 / 显存",
    width: 220,
    ellipsis: true,
    render: (_, device) => `${device.gpuType || "-"} · ${formatMemory(device.memoryTotalMb)}`,
  },
  {
    title: "切分形态",
    width: 160,
    ellipsis: true,
    render: (_, device) => formatProfile(device),
  },
  {
    title: "状态",
    dataIndex: "status",
    width: 120,
    fixed: "right",
    render: (status: GpuInventoryStatus) => {
      const meta = statusMeta[status];
      return <StatusBadge tone={meta.tone} value={meta.label} />;
    },
  },
  {
    title: "租户",
    dataIndex: "tenantId",
    width: 180,
    ellipsis: true,
    render: (tenantId?: string) => tenantId || "-",
  },
  {
    title: "占用对象 / 原因",
    width: 200,
    ellipsis: true,
    render: (_, device) => device.instanceId || device.reason || "-",
  },
];

interface GpuDeviceTableProps {
  data: GpuInventoryDevice[];
  loading: boolean;
}

export function GpuDeviceTable({ data, loading }: GpuDeviceTableProps) {
  return (
    <ListDataTable
      rowKey="id"
      tableLabel="GPU 设备列表"
      data={data}
      loading={loading}
      pagination="client"
      columns={columns}
      scroll={{ x: TABLE_SCROLL_X }}
      emptyText="暂无 GPU 设备"
    />
  );
}
