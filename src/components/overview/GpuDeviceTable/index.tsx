import { Tag } from "@arco-design/web-react";
import type { GpuInventoryDevice, GpuInventoryStatus } from "@/api/gpu-inventory";
import { ListDataTable, type ListColumn } from "@/components/common";

const TABLE_SCROLL_X = 1780;
const TABLE_SCROLL_Y = 300;

const statusMeta: Record<GpuInventoryStatus, { label: string; color: string }> = {
  available: { label: "空闲未分配", color: "green" },
  in_use: { label: "已占用", color: "arcoblue" },
  fault: { label: "故障", color: "red" },
  maintenance: { label: "维护中", color: "orange" },
  unavailable: { label: "不可用", color: "gray" },
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
  { title: "设备 ID", dataIndex: "id", width: 320 },
  {
    title: "节点 / 设备",
    width: 200,
    render: (_, device) => `${device.nodeName} / GPU-${device.gpuIndex}`,
  },
  {
    title: "型号 / 显存",
    width: 300,
    render: (_, device) => `${device.gpuType || "-"} · ${formatMemory(device.memoryTotalMb)}`,
  },
  {
    title: "切分形态",
    width: 320,
    render: (_, device) => formatProfile(device),
  },
  {
    title: "状态",
    dataIndex: "status",
    width: 120,
    render: (status: GpuInventoryStatus) => {
      const meta = statusMeta[status];
      return <Tag color={meta.color}>{meta.label}</Tag>;
    },
  },
  {
    title: "租户",
    dataIndex: "tenantId",
    width: 240,
    render: (tenantId?: string) => tenantId || "-",
  },
  {
    title: "占用对象 / 原因",
    width: 280,
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
      pagination={false}
      columns={columns}
      scroll={{ x: TABLE_SCROLL_X, y: TABLE_SCROLL_Y }}
      emptyText="暂无 GPU 设备"
    />
  );
}
