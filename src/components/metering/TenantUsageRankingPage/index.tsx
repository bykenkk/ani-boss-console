import { Button } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchPlatformMeteringUsage,
  platformQueryKeys,
  type PlatformMeteringUsageItem,
} from "@/api/platform";
import { ResourcePageFrame } from "@/components/common";
import { getUtcMeteringRanges } from "@/lib/date";
import { toGpuHours, type MeteringTenantRow } from "@/lib/metering";
import { MeteringDimensionCards } from "../MeteringDimensionCards";
import { meteringDimensions, type MeteringDimension } from "../model";
import { MeteringTenantTable } from "./MeteringTenantTable";
import { TenantMeteringDrawer } from "./TenantMeteringDrawer";

function sumTenantItems(items: PlatformMeteringUsageItem[]) {
  const result = new Map<string, number>();
  items.forEach((item) => {
    if (!item.tenantId) return;
    result.set(item.tenantId, (result.get(item.tenantId) || 0) + toGpuHours(item.totalQuantity));
  });
  return result;
}

export function TenantUsageRankingPage() {
  const [dimension, setDimension] = useState<MeteringDimension>("gpu");
  const [detailTenantId, setDetailTenantId] = useState<string>();
  const ranges = useMemo(() => getUtcMeteringRanges("month"), []);
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
      header={{
        title: "租户用量排行",
        subtitle: "按本月累计用量降序排列，切换维度查看各租户计量数据。",
        extra: (
          <Button
            icon={<IconRefresh />}
            loading={currentQuery.isFetching || previousQuery.isFetching}
            onClick={() => void Promise.all([currentQuery.refetch(), previousQuery.refetch()])}
          >
            刷新
          </Button>
        ),
      }}
    >
      <MeteringDimensionCards
        dimension={dimension}
        totals={totals}
        onChange={(key) => {
          setDetailTenantId(undefined);
          setDimension(key);
        }}
      />

      <MeteringTenantTable
        rows={rows}
        metricLabel={current.label}
        unit={current.unit}
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
