import { Button, Radio } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchPlatformMeteringUsage,
  platformQueryKeys,
  type PlatformMeteringUsageItem,
} from "@/api/platform";
import { ResourcePageFrame } from "@/components/common";
import { getUtcMeteringRanges, type MeteringPeriod } from "@/lib/date";
import { toGpuHours, type MeteringTenantRow } from "@/lib/metering";
import { MeteringDimensionCards } from "../MeteringDimensionCards";
import { meteringDimensions, type MeteringDimension } from "../model";
import { MeteringTenantTable } from "./MeteringTenantTable";
import { TenantMeteringDrawer } from "./TenantMeteringDrawer";

import { useMeteringTenants } from "@/hooks/useMeteringTenants";
import styles from "../MeteringPresentation/index.module.less";

function sumTenantItems(items: PlatformMeteringUsageItem[]) {
  const result = new Map<string, number>();
  items.forEach((item) => {
    if (!item.tenantId) return;
    result.set(item.tenantId, (result.get(item.tenantId) || 0) + toGpuHours(item.totalQuantity));
  });
  return result;
}

export function TenantUsageRankingPage() {
  const tenantsQuery = useMeteringTenants();
  const [period, setPeriod] = useState<MeteringPeriod>("month");
  const periodLabel =
    period === "month" ? "本月" : period === "recent-seven-days" ? "近7日" : "上月";
  const previousLabel =
    period === "month" ? "上月同期" : period === "recent-seven-days" ? "前7日" : "上上月";
  const [dimension, setDimension] = useState<MeteringDimension>("gpu");
  const [detailTenantId, setDetailTenantId] = useState<string>();
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
  const currentTenants = sumTenantItems(currentItems);
  const previousTenants = sumTenantItems(
    previousQuery.data?.items.filter((item) => item.resourceType === current.resourceType) ?? [],
  );
  const rows: MeteringTenantRow[] =
    !currentQuery.data || !previousQuery.data
      ? []
      : Array.from(new Set([...currentTenants.keys(), ...previousTenants.keys()])).map(
          (id): MeteringTenantRow => {
            const currentUsage = currentTenants.get(id) || 0;
            const previousUsage = previousTenants.get(id) || 0;
            return {
              id,
              current: currentUsage,
              previous: previousUsage,
              trend:
                currentUsage > previousUsage
                  ? "up"
                  : currentUsage < previousUsage
                    ? "down"
                    : "flat",
            };
          },
        );

  return (
    <ResourcePageFrame
      className={styles.page}
      header={{
        title: "租户用量排行",
        subtitle: "按所选周期累计用量排序，切换维度查看各租户计量数据。",
        extra: (
          <div className={styles.periods}>
            <Radio.Group
              aria-label="统计周期"
              type="button"
              value={period}
              onChange={(value) => {
                setPeriod(value as MeteringPeriod);
                setDetailTenantId(undefined);
              }}
              options={[
                { value: "month", label: "本月" },
                { value: "recent-seven-days", label: "近7日" },
                { value: "previous-month", label: "上月" },
              ]}
            />
            <Button
              icon={<IconRefresh />}
              loading={currentQuery.isFetching || previousQuery.isFetching}
              onClick={() =>
                void Promise.all([
                  currentQuery.refetch(),
                  previousQuery.refetch(),
                  tenantsQuery.refetch(),
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
        previousLabel={previousLabel}
        onChange={(key) => {
          setDetailTenantId(undefined);
          setDimension(key);
        }}
      />

      <MeteringTenantTable
        key={dimension + period}
        tenants={tenantsQuery.data || []}
        periodLabel={periodLabel}
        previousLabel={previousLabel}
        rows={rows}
        metricLabel={current.cardLabel}
        unit={current.cardUnit}
        loading={currentQuery.isPending || previousQuery.isPending}
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
    </ResourcePageFrame>
  );
}
