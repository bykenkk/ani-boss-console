import { Button, Tabs } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useState } from "react";
import { ListPageHeader } from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { formatMonthDay } from "@/lib/date";
import { MeteringTrend } from "../MeteringTrend";
import { meteringDimensions, type MeteringDimension } from "../model";
import { MeteringTenantTable } from "./MeteringTenantTable";
import { TenantMeteringDrawer } from "./TenantMeteringDrawer";
import { formatUsage, getChangeRate, usePlatformGpuMetering } from "./usePlatformGpuMetering";

export function PlatformMeteringPage() {
  const [dimension, setDimension] = useState<MeteringDimension>("gpu");
  const [detailTenantId, setDetailTenantId] = useState<string>();
  const current =
    meteringDimensions.find((item) => item.key === dimension) ?? meteringDimensions[0];
  const { query, view, ranges } = usePlatformGpuMetering(current.resourceType);
  const totalChangeRate = view ? getChangeRate(view.currentTotal, view.previousTotal) : undefined;
  const metricValue = (value?: string) => (query.isPending || !query.data ? "-" : value || "-");

  return (
    <div className="space-y-4">
      <ListPageHeader
        title="计量总览"
        subtitle="汇总 ANI 平台计量数据与租户用量分布；当前数据用于资源运营观察，不作为账单依据。"
        extra={
          <Button
            icon={<IconRefresh />}
            loading={query.isFetching}
            onClick={() => void query.refetch()}
          >
            刷新
          </Button>
        }
      />

      <Tabs
        activeTab={dimension}
        onChange={(key) => {
          setDetailTenantId(undefined);
          setDimension(key as MeteringDimension);
        }}
        className="rounded-lg border border-gray-200 bg-white px-5 pt-1"
      >
        {meteringDimensions.map((item) => (
          <Tabs.TabPane key={item.key} title={item.label} />
        ))}
      </Tabs>

      <section className="grid grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2">
        <Metric
          label="本月合计"
          value={metricValue(view ? formatUsage(view.currentTotal) : undefined)}
          hint={current.unit}
        />
        <Metric
          label="环比"
          value={metricValue(
            totalChangeRate === undefined
              ? undefined
              : `${totalChangeRate > 0 ? "+" : ""}${totalChangeRate.toFixed(1)}%`,
          )}
          hint="较上月同期"
        />
        <Metric
          label="峰值日"
          value={metricValue(view?.peakDate ? formatMonthDay(view.peakDate) : undefined)}
          hint={
            view?.peakUsage === undefined
              ? "本月暂无日汇总"
              : `${formatUsage(view.peakUsage)} ${current.unit}`
          }
        />
        <Metric
          label="有用量租户"
          value={metricValue(view ? String(view.tenantRows.length) : undefined)}
          hint="本月或上月同期有记录"
        />
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-base font-semibold text-gray-900">近 7 日趋势</div>
            <div className="mt-1 text-xs text-gray-500">{current.description}</div>
          </div>
          <span className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-700">
            单位：{current.unit}
          </span>
        </div>
        <div className="mt-3">
          <MeteringTrend
            labels={view?.trendLabels || []}
            values={view?.trendValues || []}
            label={current.label}
            unit={current.unit}
          />
        </div>
      </section>

      <MeteringTenantTable
        rows={view?.tenantRows || []}
        metricLabel={current.label}
        unit={current.unit}
        loading={query.isPending}
        onViewDetail={setDetailTenantId}
      />

      <TenantMeteringDrawer
        key={`${current.key}-${detailTenantId || "closed"}`}
        visible={Boolean(detailTenantId)}
        tenantId={detailTenantId}
        resourceType={current.resourceType}
        metricLabel={current.label}
        unit={current.unit}
        startTime={ranges.currentStart}
        endTime={ranges.currentEnd}
        onCancel={() => setDetailTenantId(undefined)}
      />
    </div>
  );
}
