import { MetricCard } from "@/components/common";
import {
  IconThunderbolt,
  IconArchive,
  IconApps,
  IconExclamationCircle,
} from "@arco-design/web-react/icon";
import type { GpuOccupancy } from "@/api/gpu-inventory";

interface GpuSummaryProps {
  occupancy?: GpuOccupancy;
  occupancyPending: boolean;
}

function metricValue(value: number | undefined, pending: boolean) {
  return pending || value === undefined ? "-" : String(value);
}

export function GpuSummary({ occupancy, occupancyPending }: GpuSummaryProps) {
  return (
    <section className="grid grid-cols-4 gap-3.5 max-[1280px]:grid-cols-2">
      <MetricCard
        label="物理卡"
        icon={<IconThunderbolt />}
        unit="卡"
        value={metricValue(occupancy?.total, occupancyPending)}
        subtitle="ANI 库存总量"
      />
      <MetricCard
        label="空闲"
        icon={<IconArchive />}
        unit="卡"
        tone="green"
        percent={
          !occupancyPending && occupancy
            ? occupancy.total > 0
              ? (occupancy.available / occupancy.total) * 100
              : 0
            : undefined
        }
        value={metricValue(occupancy?.available, occupancyPending)}
        subtitle="可参与调度"
      />
      <MetricCard
        label="已占用"
        icon={<IconApps />}
        unit="卡"
        tone="amber"
        percent={
          !occupancyPending && occupancy
            ? occupancy.total > 0
              ? (occupancy.inUse / occupancy.total) * 100
              : 0
            : undefined
        }
        value={metricValue(occupancy?.inUse, occupancyPending)}
        subtitle="节点级占用映射"
      />
      <MetricCard
        label="故障"
        icon={<IconExclamationCircle />}
        unit="卡"
        value={metricValue(occupancy?.fault, occupancyPending)}
        subtitle="不参与调度"
        tone="red"
      />
    </section>
  );
}
