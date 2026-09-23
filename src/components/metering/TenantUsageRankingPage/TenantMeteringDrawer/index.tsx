import { Drawer, Empty, Tabs } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchPlatformMeteringUsage,
  platformQueryKeys,
  type PlatformMeteringGroupBy,
  type PlatformMeteringResourceType,
  type PlatformMeteringUsageParams,
} from "@/api/platform";
import { DataTable, type ListColumn } from "@/components/common";
import { formatDate, formatDateHour, formatUtcDate } from "@/lib/date";
import { withId } from "@/lib/id";
import { MeteringTrend } from "../../MeteringTrend";
import { formatUsage, toGpuHours } from "@/lib/metering";

type DetailGroupBy = Extract<PlatformMeteringGroupBy, "day" | "hour">;

interface TenantMeteringDrawerProps {
  visible: boolean;
  tenantId?: string;
  resourceType: PlatformMeteringResourceType;
  metricLabel: string;
  unit: string;
  startTime: string;
  endTime: string;
  onCancel: () => void;
}

interface TenantMeteringDetailRow {
  id: string;
  period: string;
  usage: number;
}

function formatPeriod(period: string, groupBy: DetailGroupBy) {
  return groupBy === "hour" ? formatDateHour(period) : formatDate(period);
}

export function TenantMeteringDrawer({
  visible,
  tenantId,
  resourceType,
  metricLabel,
  unit,
  startTime,
  endTime,
  onCancel,
}: TenantMeteringDrawerProps) {
  const [groupBy, setGroupBy] = useState<DetailGroupBy>("day");
  const params = useMemo<PlatformMeteringUsageParams | undefined>(() => {
    if (!tenantId) return undefined;
    return { startTime, endTime, resourceType, groupBy, tenantId };
  }, [endTime, groupBy, resourceType, startTime, tenantId]);

  const detailQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("platform-metering-tenant", tenantId, resourceType, groupBy),
        action: `${metricLabel}租户明细加载`,
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: params
      ? platformQueryKeys.meteringUsage(params)
      : (["platform", "metering-usage", "tenant-detail-disabled"] as const),
    enabled: visible && Boolean(params),
    queryFn: () => {
      if (!params) throw new Error("缺少租户计量查询参数");
      return fetchPlatformMeteringUsage(params);
    },
    staleTime: 60_000,
  });

  const rows = useMemo<TenantMeteringDetailRow[]>(
    () =>
      (detailQuery.data?.items || []).map((item, index) => ({
        id: `${item.period || "unknown"}-${index}`,
        period: item.period ? formatPeriod(item.period, groupBy) : "-",
        usage: toGpuHours(item.totalQuantity),
      })),
    [detailQuery.data?.items, groupBy],
  );

  const columns: ListColumn<TenantMeteringDetailRow>[] = [
    {
      title: groupBy === "day" ? "日期" : "小时",
      dataIndex: "period",
      width: 220,
    },
    {
      title: `用量（${unit}）`,
      dataIndex: "usage",
      width: 220,
      render: (_, row) => formatUsage(row.usage),
    },
  ];

  return (
    <Drawer
      width={760}
      title={`${metricLabel} · 租户用量明细`}
      visible={visible}
      onCancel={onCancel}
      footer={null}
      unmountOnExit
    >
      <div className="space-y-4">
        <div>
          <div className="text-xs text-gray-500">租户 ID</div>
          <div className="mt-1 break-all font-mono text-sm text-gray-900">{tenantId || "-"}</div>
          <div className="mt-2 text-xs text-gray-500">
            查询范围：{formatUtcDate(startTime)} 至 {formatUtcDate(endTime)}（UTC）
          </div>
        </div>

        <Tabs activeTab={groupBy} onChange={(key) => setGroupBy(key as DetailGroupBy)}>
          <Tabs.TabPane key="day" title="按天" />
          <Tabs.TabPane key="hour" title="按小时" />
        </Tabs>

        <MeteringTrend
          labels={rows.map((row) => row.period)}
          values={rows.map((row) => Number(row.usage.toFixed(2)))}
          label={`${metricLabel} 租户明细`}
          unit={unit}
        />

        <DataTable
          rowKey="id"
          columns={columns}
          data={rows}
          loading={detailQuery.isPending}
          pagination={false}
          scroll={{ x: 520, y: 360 }}
          tableLabel={`${metricLabel} 租户计量明细`}
          noDataElement={<Empty description={`当前时间范围内暂无 ${metricLabel} 明细`} />}
        />
      </div>
    </Drawer>
  );
}
