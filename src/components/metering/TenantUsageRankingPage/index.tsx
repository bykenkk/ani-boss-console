import { Button, Radio } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  listResourceUsageTenants,
  resourceUsageKeys,
  type ResourceUsageOrder,
  type ResourceUsageTenantRow,
} from "@/api/resource-usage";
import { ResourcePageFrame } from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { getCurrentTimestamp, getResourceUsageRange } from "@/lib/date";
import { MeteringDimensionCards } from "../MeteringDimensionCards";
import {
  meteringDimensions,
  usagePeriodHours,
  usagePeriodOptions,
  type MeteringDimension,
  type ResourceUsagePeriod,
} from "../model";
import { MeteringTenantTable } from "./MeteringTenantTable";
import { TenantMeteringDrawer } from "./TenantMeteringDrawer";
import styles from "../MeteringPresentation/index.module.less";

export function TenantUsageRankingPage() {
  const [period, setPeriod] = useState<ResourceUsagePeriod>("24h");
  const [dimension, setDimension] = useState<MeteringDimension>("gpu");
  const [reference, setReference] = useState(getCurrentTimestamp);
  const [keyword, setKeyword] = useState("");
  const [order, setOrder] = useState<ResourceUsageOrder>("desc");
  const [detailTenant, setDetailTenant] = useState<ResourceUsageTenantRow>();
  function refreshRangeIfStale() {
    const now = getCurrentTimestamp();
    if (now - reference > 30_000) setReference(now);
  }
  const range = useMemo(
    () => getResourceUsageRange(usagePeriodHours[period], reference),
    [period, reference],
  );
  const pagination = useListPagination(JSON.stringify({ period, dimension, keyword, order }));
  const current = meteringDimensions.find((item) => item.key === dimension)!;
  const params = {
    ...range,
    metric: dimension,
    keyword: keyword || undefined,
    order,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  const rankingQuery = useQuery({
    queryKey: resourceUsageKeys.tenants(params),
    queryFn: ({ signal }) => listResourceUsageTenants(params, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      errorNotification: {
        id: "resource-usage-tenants",
        action: "租户资源使用排行加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });

  return (
    <ResourcePageFrame
      className={styles.page}
      header={{
        title: "租户用量排行",
        subtitle: "按所选周期平均实际用量排序；顶部展示全平台统计，搜索和翻页不改变合计。",
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
                setDetailTenant(undefined);
              }}
            />
            <Button
              icon={<IconRefresh />}
              loading={rankingQuery.isFetching}
              onClick={() => {
                setReference(getCurrentTimestamp());
                setDetailTenant(undefined);
              }}
            >
              刷新
            </Button>
          </div>
        ),
      }}
    >
      <MeteringDimensionCards
        dimension={dimension}
        metrics={rankingQuery.data?.metrics ?? []}
        onChange={(key) => {
          refreshRangeIfStale();
          setDetailTenant(undefined);
          setDimension(key);
        }}
      />
      <MeteringTenantTable
        rows={rankingQuery.data?.items ?? []}
        total={rankingQuery.data?.total}
        stepSeconds={rankingQuery.data?.stepSeconds}
        metricLabel={current.cardLabel}
        unit={current.unit}
        keyword={keyword}
        order={order}
        onKeywordChange={(value) => {
          refreshRangeIfStale();
          setKeyword(value);
        }}
        onOrderChange={(value) => {
          refreshRangeIfStale();
          setOrder(value);
        }}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          setPage: (page) => {
            refreshRangeIfStale();
            pagination.setPage(page);
          },
          setPageSize: (pageSize) => {
            refreshRangeIfStale();
            pagination.setPageSize(pageSize);
          },
        }}
        loading={rankingQuery.isPending}
        onViewDetail={(tenant) => {
          refreshRangeIfStale();
          setDetailTenant(tenant);
        }}
      />
      {detailTenant && (
        <TenantMeteringDrawer
          tenantId={detailTenant.tenantId}
          tenantName={detailTenant.tenantName}
          metric={dimension}
          start={range.start}
          end={range.end}
          onCancel={() => setDetailTenant(undefined)}
        />
      )}
    </ResourcePageFrame>
  );
}
