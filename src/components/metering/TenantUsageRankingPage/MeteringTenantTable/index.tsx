import { ListDataTable, TableSectionFrame, type ListColumn } from "@/components/common";
import { formatUsage, getChangeRate, type MeteringTenantRow } from "@/lib/metering";

interface MeteringTenantTableProps {
  rows: MeteringTenantRow[];
  metricLabel: string;
  unit: string;
  loading: boolean;
  onViewDetail: (tenantId: string) => void;
}

export function MeteringTenantTable({
  rows,
  metricLabel,
  unit,
  loading,
  onViewDetail,
}: MeteringTenantTableProps) {
  const sortedRows = [...rows].sort((left, right) => right.current - left.current);

  const columns: ListColumn<MeteringTenantRow>[] = [
    {
      title: "租户 ID",
      dataIndex: "id",
      width: 300,
      fixed: "left",
      render: (id) => <span className="font-mono text-xs">{id}</span>,
    },
    {
      title: `本月用量（${unit}）`,
      width: 210,
      render: (_, tenant) => formatUsage(tenant.current),
    },
    {
      title: `上月同期（${unit}）`,
      width: 210,
      render: (_, tenant) => formatUsage(tenant.previous),
    },
    {
      title: "环比",
      width: 130,
      render: (_, tenant) => {
        const rate = getChangeRate(tenant.current, tenant.previous);
        if (rate === undefined) return "-";
        return (
          <span
            className={
              tenant.trend === "up"
                ? "text-orange-600"
                : tenant.trend === "down"
                  ? "text-green-600"
                  : "text-gray-500"
            }
          >
            {rate > 0 ? "+" : ""}
            {rate.toFixed(1)}%
          </span>
        );
      },
    },
  ];

  return (
    <TableSectionFrame>
      <ListDataTable
        rowKey="id"
        columns={columns}
        rowActions={[
          {
            key: "view-detail",
            label: "查看明细",
            onClick: (tenant) => onViewDetail(tenant.id),
          },
        ]}
        data={sortedRows}
        loading={loading}
        pagination={false}
        scroll={{ x: 970 }}
        emptyText={`当前时间范围内暂无 ${metricLabel} 计量数据`}
      />
    </TableSectionFrame>
  );
}
