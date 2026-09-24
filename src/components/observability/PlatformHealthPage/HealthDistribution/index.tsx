import { Card, Empty } from "@arco-design/web-react";
import ReactECharts from "echarts-for-react";
import type { EChartsOption } from "echarts";
import type { ComponentHealthSummary } from "../model";

interface HealthDistributionProps {
  summary: ComponentHealthSummary;
  hasData: boolean;
  pending: boolean;
}

export function HealthDistribution({ summary, hasData, pending }: HealthDistributionProps) {
  const states = summary.states.filter((state) => state.key !== "other" || state.count > 0);

  const option: EChartsOption = {
    animation: false,
    grid: { left: 0, right: 0, top: 8, bottom: 8 },
    tooltip: { trigger: "item", confine: true },
    xAxis: { type: "value", max: summary.total, show: false },
    yAxis: { type: "category", data: ["组件"], show: false },
    series: states.map((state) => ({
      type: "bar",
      name: state.label,
      stack: "health",
      data: [state.count],
      barWidth: 16,
      itemStyle: { color: state.color },
    })),
  };

  return (
    <Card className="h-full [&_.arco-card-body]:p-5">
      <div className="flex items-center justify-between gap-3">
        <h3 className="m-0 text-base font-semibold text-(--color-text-1)">组件状态分布</h3>
        <span className="text-xs text-(--color-text-3)">
          共 {hasData ? summary.total : "-"} 个组件
        </span>
      </div>
      {summary.total > 0 ? (
        <div
          role="img"
          aria-label={states.map((state) => state.label + " " + state.count + " 个").join("；")}
        >
          <ReactECharts option={option} notMerge style={{ height: 64, width: "100%" }} />
        </div>
      ) : pending ? (
        <div className="py-7 text-sm text-(--color-text-3)">正在获取组件状态</div>
      ) : (
        <Empty description="暂无组件状态数据" />
      )}
      <div className="flex flex-wrap gap-x-7 gap-y-3">
        {states.map((state) => (
          <div key={state.key} className="flex items-center gap-2 text-sm text-(--color-text-2)">
            <span
              className="h-2.5 w-2.5 rounded-sm"
              style={{ backgroundColor: state.color }}
              aria-hidden
            />
            <span>{state.label}</span>
            <strong className="text-base text-(--color-text-1) tabular-nums">
              {hasData ? state.count : "-"}
            </strong>
            <span className="text-xs text-(--color-text-3) tabular-nums">
              {hasData ? state.percentage : "-"}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
}
