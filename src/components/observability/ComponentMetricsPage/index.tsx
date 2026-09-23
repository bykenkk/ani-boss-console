import { Card, Select } from "@arco-design/web-react";
import { useState } from "react";
import { ResourcePageFrame, StatusBadge } from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { MonitoringTrend } from "../MonitoringTrend";
import { platformComponents } from "../model";

const metricSeries = [
  {
    title: "P99 延迟",
    unit: "ms",
    values: [120, 140, 180, 360, 820, 460, 180],
  },
  {
    title: "错误率",
    unit: "%",
    values: [0.2, 0.4, 1.2, 6.8, 12.2, 4.1, 1.2],
    color: "#f53f3f",
  },
  {
    title: "就绪副本",
    unit: "个",
    values: [3, 3, 3, 2, 2, 2, 2],
    color: "#00b42a",
  },
  {
    title: "依赖探测延迟",
    unit: "ms",
    values: [22, 24, 28, 80, 320, 210, 180],
    color: "#722ed1",
  },
];

export function ComponentMetricsPage() {
  const [service, setService] = useState("model-service");
  const component =
    platformComponents.find((item) => item.service === service) ?? platformComponents[0];

  return (
    <ResourcePageFrame
      header={{
        title: "组件指标",
        subtitle: "查看组件运行指标和依赖探测结果。",
        extra: (
          <Select
            value={service}
            onChange={setService}
            style={{ width: 210 }}
            options={platformComponents.map((item) => ({
              label: `${item.name} (${item.service})`,
              value: item.service,
            }))}
          />
        ),
      }}
    >
      <section className="grid grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2">
        <Metric
          label="P99 延迟"
          value={component.p99Ms === undefined ? "-" : `${component.p99Ms} ms`}
          hint={component.service}
        />
        <Metric
          label="错误率"
          value={`${component.errorRate.toFixed(2)}%`}
          hint="近 5 分钟"
          tone={component.errorRate > 1 ? "danger" : ""}
        />
        <Metric label="就绪副本" value={component.replicas} hint="ready / desired" />
        <Metric label="请求量" value={component.requestRate} hint="当前速率" />
      </section>

      <section className="grid grid-cols-2 gap-3.5 max-[980px]:grid-cols-1">
        {metricSeries.map((panel) => (
          <MonitoringTrend key={panel.title} panel={panel} />
        ))}
      </section>

      <Card className="[&_.arco-card-body]:p-5">
        <div className="text-base font-semibold text-gray-900">依赖检查</div>
        <div className="mt-3 space-y-2">
          {component.dependencies.map((dependency) => (
            <div
              key={dependency.name}
              className="flex items-center justify-between rounded border border-gray-100 px-4 py-3"
            >
              <div>
                <div className="font-medium text-gray-800">{dependency.name}</div>
                <div className="mt-1 text-xs text-gray-500">
                  {dependency.error ?? "依赖探测正常"}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  value={dependency.status}
                  tone={dependency.status === "ok" ? "success" : "danger"}
                />
                {dependency.latencyMs === undefined ? null : <span>{dependency.latencyMs} ms</span>}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </ResourcePageFrame>
  );
}
