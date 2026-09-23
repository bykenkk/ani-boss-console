import { ResourcePageFrame } from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { OverviewPageHeader } from "@/components/overview/OverviewPageHeader";
import { Panel } from "@/components/overview/Panel";
import { StatusDonutChart } from "@/components/overview/StatusDonutChart";
import { TrendChart } from "@/components/overview/TrendChart";
import { statusData } from "@/components/overview/model";

export type ResourceStatusKind = keyof typeof statusData;

export function ResourceStatusPage({ kind }: { kind: ResourceStatusKind }) {
  const data = statusData[kind];

  return (
    <ResourcePageFrame header={<OverviewPageHeader title={data.title} subtitle={data.subtitle} />}>
      <section className="grid grid-cols-4 gap-3.5">
        {data.metrics.map((item, index) => (
          <Metric
            key={item[0]}
            label={item[0]}
            value={item[1]}
            hint={item[2]}
            tone={index === 1 || index === 3 ? "warning" : ""}
          />
        ))}
      </section>
      <div className="grid grid-cols-2 gap-3.5">
        <Panel title={data.trendTitle}>
          <TrendChart />
        </Panel>
        <Panel title={data.distributionTitle}>
          <StatusDonutChart />
        </Panel>
      </div>
    </ResourcePageFrame>
  );
}
