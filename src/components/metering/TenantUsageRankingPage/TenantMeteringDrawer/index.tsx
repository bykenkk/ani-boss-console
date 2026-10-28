import { Drawer, Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  getResourceUsageTenant,
  resourceUsageKeys,
  type ResourceUsageMetric,
  type ResourceUsagePoint,
} from "@/api/resource-usage";
import { DataTable, SummaryStrip, type ListColumn } from "@/components/common";
import { formatDateTimeMinute, formatMonthDayTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { UsageQuality, UsageValue } from "../../MeteringPresentation";
import { MeteringTrend } from "../../MeteringTrend";
import { meteringDimensions } from "../../model";

interface TenantMeteringDrawerProps {
  tenantId: number;
  tenantName: string;
  metric: ResourceUsageMetric;
  start: string;
  end: string;
  onCancel: () => void;
}

export function TenantMeteringDrawer({
  tenantId,
  tenantName,
  metric,
  start,
  end,
  onCancel,
}: TenantMeteringDrawerProps) {
  const params = { start, end, metric };
  const current = meteringDimensions.find((item) => item.key === metric)!;
  const detailQuery = useQuery({
    queryKey: resourceUsageKeys.tenant(tenantId, params),
    queryFn: ({ signal }) => getResourceUsageTenant(tenantId, params, signal),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    meta: {
      errorNotification: {
        id: withId("resource-usage-tenant", tenantId, metric),
        action: "租户资源使用明细加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  const detail = detailQuery.data;
  const usage = detail?.metrics.find((item) => item.metric === metric);
  const points = usage?.points ?? [];
  const columns: ListColumn<ResourceUsagePoint>[] = [
    {
      title: "观测区间开始",
      dataIndex: "timestamp",
      width: 180,
      render: (value) => formatDateTimeMinute(value),
    },
    {
      title: "观测区间结束",
      dataIndex: "end",
      width: 180,
      render: (value) => formatDateTimeMinute(value),
    },
    {
      title: "平均值（" + current.unit + "）",
      width: 180,
      render: (_, row) => (
        <UsageValue value={row.value} knownValue={row.knownValue} unit={current.unit} />
      ),
    },
    {
      title: "采样峰值（" + current.unit + "）",
      width: 160,
      render: (_, row) => <UsageValue value={row.peak} unit={current.unit} />,
    },
  ];

  return (
    <Drawer
      width={800}
      title={current.cardLabel + " · 租户使用明细"}
      visible
      onCancel={onCancel}
      footer={null}
    >
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium">{detail?.tenantName ?? tenantName}</div>
          <div className="mt-1 font-mono text-xs text-gray-500">租户 ID：{tenantId}</div>
          <div className="mt-2 text-xs text-gray-500">
            查询范围：{formatDateTimeMinute(detail?.start ?? start)} 至{" "}
            {formatDateTimeMinute(detail?.end ?? end)}
          </div>
        </div>
        <SummaryStrip
          pending={detailQuery.isPending}
          items={[
            {
              label: "平均" + current.label,
              value: (
                <UsageValue value={usage?.mean} knownValue={usage?.knownMean} unit={current.unit} />
              ),
            },
            {
              label: "周期采样峰值",
              value: (
                <UsageValue value={usage?.peak} knownValue={usage?.knownPeak} unit={current.unit} />
              ),
              note: detail
                ? "按 " +
                  detail.stepSeconds +
                  " 秒采样网格计算" +
                  (usage?.peakAt ? "；出现在 " + formatDateTimeMinute(usage.peakAt) : "")
                : undefined,
            },
            {
              label: "数据完整性",
              value: <UsageQuality quality={usage?.quality} />,
              note: detail?.dataCutoff
                ? "数据截止 " + formatDateTimeMinute(detail.dataCutoff)
                : undefined,
            },
          ]}
        />
        <MeteringTrend
          labels={points.map((point) => formatMonthDayTime(point.timestamp))}
          values={points.map((point) => point.value ?? null)}
          knownValues={points.map((point) => point.knownValue ?? null)}
          label={current.label}
          unit={current.unit}
        />
        <DataTable
          header={{ title: "观测明细", description: "缺失观测不补零；部分数据单独标明已知部分。" }}
          rowKey="timestamp"
          columns={columns}
          data={points}
          loading={detailQuery.isPending}
          pagination={false}
          scroll={{ x: 700, y: 360 }}
          tableLabel={current.cardLabel + " 租户使用明细"}
          noDataElement={<Empty description="当前时间范围内暂无观测明细" />}
        />
      </div>
    </Drawer>
  );
}
