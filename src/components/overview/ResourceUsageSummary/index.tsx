import { MetricCard } from "@/components/common";
import {
  IconApps,
  IconArchive,
  IconExclamationCircle,
  IconStorage,
  IconThunderbolt,
  IconUserGroup,
} from "@arco-design/web-react/icon";
import type { ReactNode } from "react";
import type { GpuOccupancy } from "@/api/gpu-inventory";

interface ResourceUsageSummaryProps {
  gpuTotal?: number;
  occupancy?: GpuOccupancy;
  tenantCount?: number;
  loading: boolean;
}

interface ResourceMetric {
  label: string;
  value: ReactNode;
  hint: string;
  icon: ReactNode;
}

function formatValue(value: number | undefined, loading: boolean) {
  return loading || value === undefined ? "-" : value.toLocaleString("zh-CN");
}

export function ResourceUsageSummary({
  gpuTotal,
  occupancy,
  tenantCount,
  loading,
}: ResourceUsageSummaryProps) {
  const abnormalCount = occupancy
    ? occupancy.fault + occupancy.maintenanceCount + occupancy.unavailableCount
    : undefined;
  const metrics: ResourceMetric[] = [
    {
      label: "GPU 库存总量",
      value: formatValue(gpuTotal ?? occupancy?.total, loading),
      hint: "全部设备合计",
      icon: <IconThunderbolt />,
    },
    {
      label: "物理卡 / 逻辑卡",
      value:
        loading || !occupancy ? (
          "- / -"
        ) : (
          <>
            {occupancy.physicalCardCount ?? 0}
            <small>/ {occupancy.logicalCardCount ?? 0}</small>
          </>
        ),
      hint: "含 vGPU 切分",
      icon: <IconStorage />,
    },
    {
      label: "空闲未分配",
      value: formatValue(occupancy?.available, loading),
      hint: "可切分 / 可用",
      icon: <IconArchive />,
    },
    {
      label: "已占用",
      value: formatValue(occupancy?.inUse, loading),
      hint: `覆盖 ${occupancy?.tenantCount ?? 0} 个租户`,
      icon: <IconApps />,
    },
    {
      label: "异常",
      value: formatValue(abnormalCount, loading),
      hint: occupancy
        ? `维护 ${occupancy.maintenanceCount} · 不可用 ${occupancy.unavailableCount} · 故障 ${occupancy.fault}`
        : "维护 0 · 不可用 0 · 故障 0",
      icon: <IconExclamationCircle />,
    },
    {
      label: "租户数",
      value: formatValue(tenantCount, loading),
      hint: "状态可用的租户",
      icon: <IconUserGroup />,
    },
  ];

  return (
    <div className="grid grid-cols-3 gap-4 max-[1100px]:grid-cols-2">
      {metrics.map((metric, index) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
          unit={index === 1 ? undefined : index === 5 ? "个" : "卡"}
          subtitle={index === 4 ? "不参与调度" : metric.hint}
          tone={(["blue", "blue", "green", "amber", "red", "purple"] as const)[index]}
          percent={
            !loading && occupancy && (index === 2 || index === 3)
              ? occupancy.total > 0
                ? ((index === 2 ? occupancy.available : occupancy.inUse) / occupancy.total) * 100
                : 0
              : undefined
          }
          foot={
            index === 2
              ? "物理卡口径 · 未分配"
              : index === 3
                ? "节点级占用映射"
                : index === 4
                  ? metric.hint
                  : undefined
          }
        />
      ))}
    </div>
  );
}
