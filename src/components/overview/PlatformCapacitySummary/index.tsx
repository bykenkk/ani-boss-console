import { Card, Empty, Tag } from "@arco-design/web-react";
import type { PlatformCapacityRegion } from "@/api/platform";

interface PlatformCapacitySummaryProps {
  region?: PlatformCapacityRegion;
  loading: boolean;
}

function formatValue(value: number | undefined) {
  return value === undefined ? "-" : value.toLocaleString("zh-CN");
}

function regionTitle(region?: PlatformCapacityRegion) {
  if (!region) return "平台（默认区域）";
  return region.displayName || region.name || region.code;
}

export function PlatformCapacitySummary({ region, loading }: PlatformCapacitySummaryProps) {
  const rows = region
    ? [
        ["GPU 空闲 / 总量", `${region.capacity.gpuFree} / ${region.capacity.gpuTotal}`],
        ["节点 / AZ", `${region.capacity.nodes} · ${region.azs.join(", ") || "-"}`],
        ["CPU 总量（allocatable）", `${formatValue(region.capacity.cpuCores)} 核`],
        ["内存总量（allocatable）", `${formatValue(region.capacity.memoryGiB)} GiB`],
        ["租户数", formatValue(region.tenantCount)],
      ]
    : [];

  return (
    <Card
      title={regionTitle(region)}
      extra={
        region ? (
          <Tag color={region.status === "enabled" && region.openForTenant ? "arcoblue" : "gray"}>
            {region.status === "enabled" && region.openForTenant ? "可开通" : "未开放"}
          </Tag>
        ) : null
      }
      className="h-full rounded-lg [&_.arco-card-body]:px-5 [&_.arco-card-body]:py-1"
    >
      {loading ? (
        <div className="flex min-h-65 items-center justify-center text-sm text-(--color-text-3)">
          正在加载平台容量…
        </div>
      ) : !region ? (
        <div className="flex min-h-65 items-center justify-center">
          <Empty description="暂无平台容量数据" />
        </div>
      ) : (
        <div>
          {rows.map(([label, value]) => (
            <div
              key={label}
              className="flex min-h-14 items-center justify-between gap-6 border-b border-(--color-border-2) px-3 last:border-b-0"
            >
              <span className="text-sm text-(--color-text-1)">{label}</span>
              <span className="text-sm text-(--color-text-1)">{value}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
