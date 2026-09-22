import { Card } from "@arco-design/web-react";
import {
  IconApps,
  IconArchive,
  IconExclamationCircle,
  IconStorage,
  IconThunderbolt,
  IconUserGroup,
} from "@arco-design/web-react/icon";
import clsx from "clsx";
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
  value: string;
  hint: string;
  icon: ReactNode;
  danger?: boolean;
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
      label: "GPU 总量",
      value: formatValue(gpuTotal ?? occupancy?.total, loading),
      hint: "全部设备合计",
      icon: <IconThunderbolt />,
    },
    {
      label: "物理卡 / 逻辑卡",
      value: loading
        ? "- / -"
        : `${occupancy?.physicalCardCount ?? 0} / ${occupancy?.logicalCardCount ?? 0}`,
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
      danger: Boolean(abnormalCount),
    },
    {
      label: "租户数",
      value: formatValue(tenantCount, loading),
      hint: "状态可用的租户",
      icon: <IconUserGroup />,
    },
  ];

  return (
    <Card title="资源使用情况" className="h-full rounded-lg">
      <div className="grid grid-cols-3 gap-3 max-[1280px]:grid-cols-2">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="group relative flex min-h-31 items-center gap-4 overflow-hidden rounded-lg border border-white bg-white px-4 py-5 shadow transition duration-200 ease-out hover:-translate-y-px hover:bg-[linear-gradient(135deg,#f0f6ff_0%,#fff_66%)] hover:shadow-[0_4px_14px_rgba(42,89,161,0.1)] motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span
              className="relative z-10 flex h-11 w-11 flex-none items-center justify-center rounded-md bg-(--color-fill-1) text-lg text-(--color-text-3)"
              aria-hidden="true"
            >
              {metric.icon}
            </span>
            <div className="relative z-10 flex min-w-0 flex-1 flex-col">
              <span className="text-sm text-(--color-text-2) transition-colors group-hover:text-[rgb(var(--primary-6))]">
                {metric.label}
              </span>
              <strong
                className={clsx(
                  "mt-1 text-[30px] leading-9 font-medium",
                  metric.danger ? "text-[rgb(var(--danger-6))]" : "text-(--color-text-1)",
                )}
              >
                {metric.value}
              </strong>
              <span className="mt-2 truncate text-xs text-(--color-text-2)" title={metric.hint}>
                {metric.hint}
              </span>
            </div>
            <span
              className="pointer-events-none absolute -right-6 -bottom-10 text-[100px] leading-none text-[#eef3fa] opacity-[0.55] transition duration-200 ease-out group-hover:text-[#e4eefb] group-hover:opacity-70 motion-reduce:transition-none"
              aria-hidden="true"
            >
              {metric.icon}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
