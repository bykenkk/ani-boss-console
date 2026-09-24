import { Card } from "@arco-design/web-react";
import type { ReactNode } from "react";
import {
  ListDataTable,
  type ListColumn,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/common";
import type { GpuInventoryDevice, GpuInventoryStatus } from "@/api/gpu-inventory";

const statusMeta: Record<GpuInventoryStatus, { label: string; tone: StatusBadgeTone }> = {
  available: {
    label: "空闲（未分配）",
    tone: "success",
  },
  in_use: { label: "租户已占用", tone: "default" },
  fault: { label: "不可用", tone: "danger" },
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
  if (mode === "wholecard") return "整卡";

  if (mode === "vgpu") {
    return device.shares && device.shares > 1 ? `vGPU · ${device.shares} 份` : "vGPU";
  }

  if (device.shares === 1) return "整卡";
  if (device.shares && device.shares > 1) return `vGPU · ${device.shares} 份`;
  return "整卡";
}

function formatModel(device: GpuInventoryDevice) {
  const memory = formatMemory(device.memoryTotalMb);
  return memory === "-" ? device.gpuType || "-" : `${device.gpuType} · ${memory}`;
}

function formatOwnership(device: GpuInventoryDevice) {
  const parts = [device.tenantId, device.instanceId].filter(Boolean);
  return parts.length ? parts.join(" · ") : "-";
}

const columns: ListColumn<GpuInventoryDevice>[] = [
  {
    title: "节点 / 卡",
    width: 200,
    ellipsis: true,
    fixed: "left",
    render: (_, device) => `${device.nodeName} / GPU-${device.gpuIndex}`,
  },
  {
    title: "型号",
    width: 250,
    ellipsis: true,
    render: (_, device) => formatModel(device),
  },
  {
    title: "切分",
    width: 150,
    ellipsis: true,
    render: (_, device) => formatProfile(device),
  },
  {
    title: "状态",
    dataIndex: "status",
    width: 160,
    render: (status: GpuInventoryStatus) => {
      const meta = statusMeta[status] || {
        label: status || "-",
        tone: "default",
      };
      return <StatusBadge value={meta.label} tone={meta.tone} />;
    },
  },
  {
    title: "归属",
    width: 200,
    ellipsis: true,
    render: (_, device) => formatOwnership(device),
  },
];

interface GpuInventoryTableProps {
  data: GpuInventoryDevice[];
  loading: boolean;
  extra?: ReactNode;
}

export function GpuInventoryTable({ data, loading, extra }: GpuInventoryTableProps) {
  return (
    <Card className="overflow-hidden rounded-lg [&_.arco-card-body]:p-0">
      <ListDataTable
        header={{ title: "设备列表 · 分配", extra, className: "px-5.5 py-4.5" }}
        tableLabel="GPU 设备列表"
        rowKey="id"
        columns={columns}
        data={data}
        loading={loading}
        pagination="client"
        emptyText="暂无 GPU 设备"
      />
    </Card>
  );
}
