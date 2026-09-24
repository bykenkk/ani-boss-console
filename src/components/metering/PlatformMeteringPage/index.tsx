import { Button, Radio } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchPlatformMeteringUsage,
  platformQueryKeys,
  type PlatformMeteringUsageItem,
} from "@/api/platform";
import { ResourcePageFrame, SummaryStrip } from "@/components/common";
import {
  formatMonthDay,
  getUtcMeteringRanges,
  listUtcDateKeys,
  type MeteringPeriod,
} from "@/lib/date";
import { withId } from "@/lib/id";
import { formatUsage, toGpuHours } from "@/lib/metering";
import { MeteringDimensionCards } from "../MeteringDimensionCards";
import { MeteringTrend } from "../MeteringTrend";
import { meteringDimensions, type MeteringDimension } from "../model";

import styles from "../MeteringPresentation/index.module.less";

const periodOptions = [
  { value: "month", label: "本月" },
  { value: "recent-seven-days", label: "近7日" },
  { value: "previous-month", label: "上月" },
];

const periodLabels: Record<MeteringPeriod, string> = {
  month: "本月",
  "recent-seven-days": "近7日",
  "previous-month": "上月",
};

function sumByPeriod(items: PlatformMeteringUsageItem[]) {
  const result = new Map<string, number>();
  items.forEach((item) => {
    if (!item.period) return;
    result.set(item.period, (result.get(item.period) || 0) + item.totalQuantity);
  });
  return result;
}

export function PlatformMeteringPage() {
  const [dimension, setDimension] = useState<MeteringDimension>("gpu");
  const [period, setPeriod] = useState<MeteringPeriod>("month");
  const ranges = useMemo(() => getUtcMeteringRanges(period), [period]);
  const trendDates =
    period === "previous-month"
      ? listUtcDateKeys(ranges.currentStart, 31)
          .filter((date) => date <= ranges.currentEnd.slice(0, 10))
          .slice(-7)
      : listUtcDateKeys(ranges.trendStart, 7);
  const current =
    meteringDimensions.find((item) => item.key === dimension) ?? meteringDimensions[0];
  const currentParams = {
    startTime: ranges.currentStart,
    endTime: ranges.currentEnd,
    groupBy: "tenant_id" as const,
  };
  const previousParams = {
    startTime: ranges.previousStart,
    endTime: ranges.previousEnd,
    groupBy: "tenant_id" as const,
  };
  const currentDaysParams = {
    startTime: ranges.currentStart,
    endTime: ranges.currentEnd,
    resourceType: current.resourceType,
    groupBy: "day" as const,
  };
  const trendDaysParams = {
    startTime: `${trendDates[0]}T00:00:00.000Z`,
    endTime: ranges.currentEnd,
    resourceType: current.resourceType,
    groupBy: "day" as const,
  };
  const currentQuery = useQuery({
    queryKey: platformQueryKeys.meteringUsage(currentParams),
    queryFn: () => fetchPlatformMeteringUsage(currentParams),
    staleTime: 60_000,
    meta: {
      errorNotification: {
        id: "platform-metering-current",
        action: "计量维度总量加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const previousQuery = useQuery({
    queryKey: platformQueryKeys.meteringUsage(previousParams),
    queryFn: () => fetchPlatformMeteringUsage(previousParams),
    staleTime: 60_000,
    meta: {
      errorNotification: {
        id: "platform-metering-previous",
        action: "上期计量数据加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const currentDaysQuery = useQuery({
    queryKey:
      period === "recent-seven-days"
        ? (["platform", "metering-peak-disabled"] as const)
        : platformQueryKeys.meteringUsage(currentDaysParams),
    queryFn: () => fetchPlatformMeteringUsage(currentDaysParams),
    enabled: period !== "recent-seven-days",
    staleTime: 60_000,
    meta: {
      errorNotification: {
        id: withId("platform-metering-peak", current.resourceType),
        action: "计量峰值加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const trendDaysQuery = useQuery({
    queryKey: platformQueryKeys.meteringUsage(trendDaysParams),
    queryFn: () => fetchPlatformMeteringUsage(trendDaysParams),
    staleTime: 60_000,
    meta: {
      errorNotification: {
        id: withId("platform-metering-trend", current.resourceType),
        action: "计量趋势加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });

  const totals = meteringDimensions.map((item) => ({
    resourceType: item.resourceType,
    previous: previousQuery.data
      ? toGpuHours(
          previousQuery.data.items
            .filter((usage) => usage.resourceType === item.resourceType)
            .reduce((sum, usage) => sum + usage.totalQuantity, 0),
        )
      : undefined,
    value: currentQuery.data
      ? toGpuHours(
          currentQuery.data.items
            .filter((usage) => usage.resourceType === item.resourceType)
            .reduce((total, usage) => total + usage.totalQuantity, 0),
        )
      : undefined,
  }));
  const currentItems =
    currentQuery.data?.items.filter((item) => item.resourceType === current.resourceType) ?? [];
  const peakItems =
    period === "recent-seven-days" ? trendDaysQuery.data?.items : currentDaysQuery.data?.items;
  const peak = Array.from(sumByPeriod(peakItems ?? []).entries()).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const trendUsage = sumByPeriod(trendDaysQuery.data?.items ?? []);
  const isFetching =
    currentQuery.isFetching ||
    previousQuery.isFetching ||
    currentDaysQuery.isFetching ||
    trendDaysQuery.isFetching;

  return (
    <ResourcePageFrame
      className={styles.page}
      header={{
        title: "计量总览",
        subtitle: "汇总 ANI 平台计量数据与租户用量分布；当前数据用于资源运营观察，不作为账单依据。",
        extra: (
          <div className={styles.periods}>
            <Radio.Group
              aria-label="统计周期"
              type="button"
              value={period}
              options={periodOptions}
              onChange={(value) => setPeriod(value as MeteringPeriod)}
            />
            <Button
              icon={<IconRefresh />}
              loading={isFetching}
              onClick={() =>
                void Promise.all([
                  currentQuery.refetch(),
                  previousQuery.refetch(),
                  trendDaysQuery.refetch(),
                  ...(period === "recent-seven-days" ? [] : [currentDaysQuery.refetch()]),
                ])
              }
            >
              刷新
            </Button>
          </div>
        ),
      }}
    >
      <MeteringDimensionCards
        dimension={dimension}
        totals={totals}
        previousLabel={
          period === "month" ? "上月同期" : period === "recent-seven-days" ? "前7日" : "上上月"
        }
        onChange={setDimension}
      />
      <SummaryStrip
        pending={currentQuery.isPending}
        items={[
          {
            label: "统计周期",
            value:
              formatMonthDay(ranges.currentStart.slice(0, 10)) +
              " ~ " +
              formatMonthDay(ranges.currentEnd.slice(0, 10)),
            note: periodLabels[period],
          },
          {
            label: "单日峰值（" + current.cardLabel + "）",
            value: peak ? formatUsage(toGpuHours(peak[1])) : "-",
            unit: current.cardUnit,
            note: peak ? "出现在 " + formatMonthDay(peak[0]) : undefined,
          },
          {
            label: "有用量租户",
            value: new Set(
              currentItems
                .filter((item) => item.totalQuantity > 0)
                .map((item) => item.tenantId)
                .filter(Boolean),
            ).size,
            unit: "个",
            note: "当前周期 · 当前维度",
          },
          {
            label: "数据口径",
            value: <span style={{ fontSize: 13, fontWeight: 400 }}>按资源实际占用时长折算</span>,
            note: "资源预留不计入实际用量",
          },
        ]}
      />
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle}>用量趋势</h3>
          <Radio.Group
            aria-label="趋势维度"
            type="button"
            value={dimension}
            onChange={(value) => setDimension(value as MeteringDimension)}
            options={meteringDimensions.map((item) => ({ value: item.key, label: item.cardLabel }))}
          />
          <span className={styles.hint}>
            {period === "previous-month" ? "上月最后 7 日" : "近 7 日"}
          </span>
          <span className={styles.chip} style={{ marginLeft: "auto" }}>
            单位：{current.cardUnit} / 天
          </span>
        </div>
        <div className={styles.chart}>
          <div className={styles.chartNote}>
            {period === "previous-month"
              ? "所选月份最后 7 日用量"
              : "当日数据随采集更新，非全天用量"}
          </div>
          <MeteringTrend
            labels={trendDates.map((date) => formatMonthDay(date))}
            values={trendDates.map((date) =>
              Number(toGpuHours(trendUsage.get(date) || 0).toFixed(2)),
            )}
            label={current.cardLabel}
            unit={current.cardUnit}
          />
          <div className={styles.legend}>{current.description}</div>
        </div>
      </section>
    </ResourcePageFrame>
  );
}
