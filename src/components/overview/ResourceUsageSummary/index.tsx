import { MetricCard } from "@/components/common";
import {
  IconApps,
  IconArchive,
  IconExclamationCircle,
  IconStorage,
  IconThunderbolt,
  IconUserGroup,
} from "@arco-design/web-react/icon";
import { formatGpuAmount, type PlatformGpuOverview } from "../gpu-capacity";

interface ResourceUsageSummaryProps {
  overview: PlatformGpuOverview;
  tenantCount?: string;
}

export function ResourceUsageSummary({ overview, tenantCount }: ResourceUsageSummaryProps) {
  const { health } = overview;
  const metrics = [
    {
      label: "物理 GPU 总量",
      value: formatGpuAmount(overview.physicalCount),
      unit: "张",
      hint: "平台已纳管设备，按设备去重",
      icon: <IconThunderbolt />,
    },
    {
      label: "共享显存总量",
      value: formatGpuAmount(
        overview.sharedTotalMiB === undefined ? undefined : overview.sharedTotalMiB / 1024,
      ),
      unit: "GiB",
      hint: "共享供给的显存分配预算",
      icon: <IconStorage />,
    },
    {
      label: "未分配资源",
      value: (
        <div className="flex flex-col gap-1 text-base">
          <span>整卡 {formatGpuAmount(overview.wholeFree)} 张</span>
          <span>
            共享显存{" "}
            {formatGpuAmount(
              overview.sharedFreeMiB === undefined ? undefined : overview.sharedFreeMiB / 1024,
            )}{" "}
            GiB
          </span>
        </div>
      ),
      hint: "未分配不代表任意规格都能创建",
      icon: <IconArchive />,
    },
    {
      label: "已分配资源",
      value: (
        <div className="flex flex-col gap-1 text-base">
          <span>整卡 {formatGpuAmount(overview.wholeAllocated)} 张</span>
          <span>
            共享显存{" "}
            {formatGpuAmount(
              overview.sharedAllocatedMiB === undefined
                ? undefined
                : overview.sharedAllocatedMiB / 1024,
            )}{" "}
            GiB
          </span>
        </div>
      ),
      hint: "已承诺资源，与实际使用量分开",
      icon: <IconApps />,
    },
    {
      label: "设备健康",
      value: (
        <div className="flex flex-col gap-1 text-base">
          <span>
            健康 {formatGpuAmount(health?.healthy)} · 不健康 {formatGpuAmount(health?.unhealthy)}
          </span>
          <span>观测未知 {formatGpuAmount(health?.unknown)}</span>
        </div>
      ),
      hint: "以设备健康和观测完整性判断",
      icon: <IconExclamationCircle />,
    },
    {
      label: "启用租户数",
      value: tenantCount === undefined ? "未知" : Number(tenantCount).toLocaleString("zh-CN"),
      unit: "个",
      hint: "平台状态为启用的租户",
      icon: <IconUserGroup />,
    },
  ];
  return (
    <div className="grid grid-cols-3 gap-4 max-[1400px]:grid-cols-2 max-[600px]:grid-cols-1">
      {metrics.map((metric, i) => (
        <MetricCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          unit={metric.unit}
          subtitle={metric.hint}
          icon={metric.icon}
          tone={(["blue", "blue", "green", "amber", "red", "purple"] as const)[i]}
        />
      ))}
    </div>
  );
}
