import { Button, Card, Radio } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchPlatformMeteringUsage,
  platformQueryKeys,
  type PlatformMeteringUsageItem,
} from "@/api/platform";
import { ResourcePageFrame } from "@/components/common";
import {
  formatMonthDay,
  getUtcMeteringRanges,
  listUtcDateKeys,
  type MeteringPeriod,
} from "@/lib/date";
import { withId } from "@/lib/id";
import { formatUsage, getChangeRate, toGpuHours } from "@/lib/metering";
import { MeteringDimensionCards } from "../MeteringDimensionCards";
import { MeteringTrend } from "../MeteringTrend";
import { meteringDimensions, type MeteringDimension } from "../model";

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
    startTime: ranges.trendStart,
    endTime: ranges.trendEnd,
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
  const currentTotal = toGpuHours(
    currentItems.reduce((total, item) => total + item.totalQuantity, 0),
  );
  const previousTotal = toGpuHours(
    previousQuery.data?.items
      .filter((item) => item.resourceType === current.resourceType)
      .reduce((total, item) => total + item.totalQuantity, 0) ?? 0,
  );
  const totalChangeRate = getChangeRate(currentTotal, previousTotal);
  const hasTotals = Boolean(currentQuery.data && previousQuery.data);
  const changeText = !hasTotals
    ? "-"
    : totalChangeRate === undefined
      ? period === "month"
        ? "上月无用量"
        : period === "recent-seven-days"
          ? "前7日无用量"
          : "上上月无用量"
      : `${totalChangeRate > 0 ? "+" : ""}${totalChangeRate.toFixed(1)}%`;
  const peakItems =
    period === "recent-seven-days" ? trendDaysQuery.data?.items : currentDaysQuery.data?.items;
  const peak = Array.from(sumByPeriod(peakItems ?? []).entries()).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const trendUsage = sumByPeriod(trendDaysQuery.data?.items ?? []);
  const trendDates = listUtcDateKeys(ranges.trendStart, 7);
  const isFetching =
    currentQuery.isFetching ||
    previousQuery.isFetching ||
    currentDaysQuery.isFetching ||
    trendDaysQuery.isFetching;

  return (
    <ResourcePageFrame
      className="h-auto! min-h-(--app-content-available-height)!"
      header={{
        title: "计量总览",
        subtitle: "汇总 ANI 平台计量数据与租户用量分布；当前数据用于资源运营观察，不作为账单依据。",
        extra: (
          <div className="flex flex-wrap items-center gap-4">
            <Radio.Group
              type="button"
              size="large"
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
      <MeteringDimensionCards dimension={dimension} totals={totals} onChange={setDimension} />

      <Card className="[&_.arco-card-body]:px-5 [&_.arco-card-body]:py-4">
        <section
          className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm"
          aria-label="计量摘要"
        >
          <strong className="text-gray-900">
            {current.cardLabel} · {periodLabels[period]}
          </strong>
          <span className="text-gray-500">
            环比 <span className="ml-2 text-gray-800">{changeText}</span>
          </span>
          <span className="text-gray-500">
            峰值日{" "}
            <span className="ml-2 text-gray-800">
              {peak
                ? `${formatMonthDay(peak[0])} · ${formatUsage(toGpuHours(peak[1]))} ${current.cardUnit}`
                : "-"}
            </span>
          </span>
          <span className="text-gray-500">
            有用量租户{" "}
            <span className="ml-2 text-gray-800">
              {currentQuery.data
                ? formatUsage(
                    new Set(
                      currentItems
                        .filter((item) => item.totalQuantity > 0)
                        .map((item) => item.tenantId)
                        .filter(Boolean),
                    ).size,
                  )
                : "-"}
            </span>
          </span>
        </section>
      </Card>

      <Card className="[&_.arco-card-body]:p-5">
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
            labels={trendDates.map((date) => formatMonthDay(date))}
            values={trendDates.map((date) =>
              Number(toGpuHours(trendUsage.get(date) || 0).toFixed(2)),
            )}
            label={current.label}
            unit={current.unit}
          />
        </div>
      </Card>
    </ResourcePageFrame>
  );
}
