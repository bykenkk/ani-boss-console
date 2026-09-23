import { Select } from "@arco-design/web-react";
import { ResourcePageFrame } from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { MonitoringTrend } from "../MonitoringTrend";
import { monitoringProfiles } from "../model";

export type MonitoringDomain = keyof typeof monitoringProfiles;

export function DomainMonitoringPage({ domain }: { domain: MonitoringDomain }) {
  const profile = monitoringProfiles[domain];
  return (
    <ResourcePageFrame
      header={{
        title: profile.title,
        subtitle: profile.subtitle,
        extra: (
          <div className="flex items-center gap-2">
            <Select
              defaultValue="1h"
              style={{ width: 120 }}
              options={[
                { label: "近 1 小时", value: "1h" },
                { label: "近 6 小时", value: "6h" },
                { label: "近 24 小时", value: "24h" },
              ]}
            />
            <Select
              defaultValue="auto"
              style={{ width: 120 }}
              options={[
                { label: "自动刷新", value: "auto" },
                { label: "暂停刷新", value: "paused" },
              ]}
            />
          </div>
        ),
      }}
    >
      <section className="grid grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2">
        {profile.metrics.map((metric) => (
          <Metric key={metric.label} {...metric} />
        ))}
      </section>
      <section className="grid grid-cols-2 gap-3.5 max-[980px]:grid-cols-1">
        {profile.panels.map((panel) => (
          <MonitoringTrend key={panel.title} panel={panel} />
        ))}
      </section>
      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="text-base font-semibold text-gray-900">当前关注项</div>
        <div className="mt-3 space-y-2">
          {profile.notices.length ? (
            profile.notices.map((notice) => (
              <div
                key={notice.title}
                className="flex items-center justify-between rounded border border-gray-100 px-4 py-3"
              >
                <span className="font-medium text-gray-800">{notice.title}</span>
                <span className={notice.tone === "danger" ? "text-red-600" : "text-orange-600"}>
                  {notice.detail}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500">暂无关注项</div>
          )}
        </div>
      </section>
    </ResourcePageFrame>
  );
}
