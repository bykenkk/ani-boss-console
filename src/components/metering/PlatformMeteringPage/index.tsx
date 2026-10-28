import { Button, Radio } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { getResourceUsageOverview, resourceUsageKeys } from "@/api/resource-usage";
import { ResourcePageFrame, SummaryStrip } from "@/components/common";
import {
  formatDateTimeMinute,
  formatMonthDayTime,
  getCurrentTimestamp,
  getResourceUsageRange,
} from "@/lib/date";
import { MeteringDimensionCards } from "../MeteringDimensionCards";
import { UsageQuality, UsageValue } from "../MeteringPresentation";
import { MeteringTrend } from "../MeteringTrend";
import {
  meteringDimensions,
  usagePeriodHours,
  usagePeriodOptions,
  type MeteringDimension,
  type ResourceUsagePeriod,
} from "../model";
import styles from "../MeteringPresentation/index.module.less";

export function PlatformMeteringPage() {
  const [dimension, setDimension] = useState<MeteringDimension>("gpu");
  const [period, setPeriod] = useState<ResourceUsagePeriod>("24h");
  const [reference, setReference] = useState(getCurrentTimestamp);
  function refreshRangeIfStale() {
    const now = getCurrentTimestamp();
    if (now - reference > 30_000) setReference(now);
  }

  function changeDimension(value: MeteringDimension) {
    refreshRangeIfStale();
    setDimension(value);
  }
  const range = useMemo(
    () => getResourceUsageRange(usagePeriodHours[period], reference),
    [period, reference],
  );
  const current = meteringDimensions.find((item) => item.key === dimension)!;
  const params = { ...range, metric: dimension };
  const overviewQuery = useQuery({
    queryKey: resourceUsageKeys.overview(params),
    queryFn: ({ signal }) => getResourceUsageOverview(params, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      errorNotification: {
        id: "resource-usage-overview",
        action: "平台资源使用统计加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const usage = overviewQuery.data?.metrics.find((item) => item.metric === dimension);
  const data = overviewQuery.data;

  return (
    <ResourcePageFrame
      className={styles.page}
      header={{
        title: "计量总览",
        subtitle:
          "全平台受管租户业务工作负载的实际使用统计；不包含配额和资源预留，不作为账单依据。",
        extra: (
          <div className={styles.periods}>
            <Radio.Group
              aria-label="统计周期"
              type="button"
              value={period}
              options={usagePeriodOptions}
              onChange={(value) => {
                setPeriod(value as ResourceUsagePeriod);
                setReference(getCurrentTimestamp());
              }}
            />
            <Button
              icon={<IconRefresh />}
              loading={overviewQuery.isFetching}
              onClick={() => setReference(getCurrentTimestamp())}
            >
              刷新
            </Button>
          </div>
        ),
      }}
    >
      <MeteringDimensionCards
        dimension={dimension}
        metrics={data?.metrics ?? []}
        onChange={changeDimension}
      />
      <SummaryStrip
        pending={overviewQuery.isPending}
        items={[
          {
            label: "统计周期",
            value: usagePeriodOptions.find((item) => item.value === period)?.label,
            note:
              formatDateTimeMinute(data?.start ?? range.start) +
              " 至 " +
              formatDateTimeMinute(data?.end ?? range.end),
          },
          {
            label: "周期采样峰值（" + current.cardLabel + "）",
            value: (
              <UsageValue value={usage?.peak} knownValue={usage?.knownPeak} unit={current.unit} />
            ),
            note: data
              ? "按 " +
                data.stepSeconds +
                " 秒采样网格计算" +
                (usage?.peakAt ? "；出现在 " + formatDateTimeMinute(usage.peakAt) : "")
              : undefined,
          },
          {
            label: "有用量租户",
            value: usage?.activeTenantCount ?? "-",
            unit: "个",
            note: "当前周期 · 当前维度",
          },
          {
            label: "数据完整性",
            value: <UsageQuality quality={usage?.quality} />,
            note: data?.dataCutoff
              ? "数据截止 " + formatDateTimeMinute(data.dataCutoff)
              : undefined,
          },
        ]}
      />
      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <h3 className={styles.panelTitle}>实际使用趋势</h3>
          <Radio.Group
            aria-label="趋势维度"
            type="button"
            value={dimension}
            onChange={(value) => changeDimension(value as MeteringDimension)}
            options={meteringDimensions.map((item) => ({ value: item.key, label: item.cardLabel }))}
          />
          <span className={styles.chip} style={{ marginLeft: "auto" }}>
            单位：{current.unit}
          </span>
        </div>
        <div className={styles.chart}>
          <div className={styles.chartNote}>缺失观测保留为空；仅展示完整观测的趋势点</div>
          <MeteringTrend
            labels={(usage?.points ?? []).map((point) => formatMonthDayTime(point.timestamp))}
            values={(usage?.points ?? []).map((point) => point.value ?? null)}
            label={current.label}
            unit={current.unit}
          />
          <div className={styles.legend}>{current.description}</div>
        </div>
      </section>
    </ResourcePageFrame>
  );
}
