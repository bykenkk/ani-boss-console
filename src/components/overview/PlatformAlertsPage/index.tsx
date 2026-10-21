import { ResourcePageFrame } from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { Button } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { PlatformAlertTable } from "@/components/overview/PlatformAlertTable";
import { platformAlerts } from "@/components/overview/model";

// TODO(alerts-integration): 接入平台告警接口后替换演示数据，并开放处理、忽略和刷新操作。
export function PlatformAlertsPage() {
  const statistics = [
    ["全部", platformAlerts.length, "平台告警"],
    ["待处理", platformAlerts.filter((item) => item.status === "待处理").length, "等待处置"],
    ["严重", platformAlerts.filter((item) => item.level === "严重").length, "需立即关注"],
    ["已处理", platformAlerts.filter((item) => item.status !== "待处理").length, "已完成或忽略"],
  ] as const;

  return (
    <ResourcePageFrame
      header={{
        title: "平台告警与待处理",
        subtitle: "跨租户平台级告警收件箱 · 未接入，当前为演示数据",
        extra: (
          <Button type="primary" disabled title="平台告警功能未接入" icon={<IconRefresh />}>
            刷新
          </Button>
        ),
      }}
    >
      <section className="grid grid-cols-4 gap-3.5">
        {statistics.map(([label, value, hint]) => (
          <Metric
            key={label}
            label={label}
            value={String(value)}
            hint={hint}
            tone={label === "严重" ? "danger" : ""}
          />
        ))}
      </section>
      <PlatformAlertTable alerts={platformAlerts} />
    </ResourcePageFrame>
  );
}
