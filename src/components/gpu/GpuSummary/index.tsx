import { Metric } from "@/components/overview/Metric";
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
      <Metric
        label="物理卡"
        value={metricValue(occupancy?.total, occupancyPending)}
        hint="ANI 库存总量"
      />
      <Metric
        label="空闲"
        value={metricValue(occupancy?.available, occupancyPending)}
        hint="可参与调度"
      />
      <Metric
        label="已占用"
        value={metricValue(occupancy?.inUse, occupancyPending)}
        hint="节点级占用映射"
      />
      <Metric
        label="故障"
        value={metricValue(occupancy?.fault, occupancyPending)}
        hint="不参与调度"
        tone={occupancy?.fault ? "danger" : ""}
      />
    </section>
  );
}
