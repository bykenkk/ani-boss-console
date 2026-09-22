import { useMemo, useState } from "react";
import { ListDataTable, TableSectionFrame, type ListColumn } from "@/components/common";
import type { MeteringTenantRow } from "../../model";
import { formatUsage, getChangeRate } from "../usePlatformGpuMetering";

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
  const [keyword, setKeyword] = useState("");
  const filteredRows = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    return rows
      .filter((tenant) => !normalizedKeyword || tenant.id.toLowerCase().includes(normalizedKeyword))
      .sort((left, right) => right.current - left.current);
  }, [keyword, rows]);

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
    <TableSectionFrame
      header={
        <div className="flex items-center justify-between px-5 pt-5">
          <div>
            <div className="text-base font-semibold text-gray-900">租户用量排行</div>
            <div className="mt-1 text-xs text-gray-500">按本月累计用量降序排列。</div>
          </div>
          <span className="text-xs text-gray-500">共 {filteredRows.length} 个租户</span>
        </div>
      }
      toolbar={{
        search: {
          fields: [{ value: "tenantId", label: "租户 ID" }],
          field: "tenantId",
          value: keyword,
          placeholder: "搜索租户 ID",
          onFieldChange: () => undefined,
          onChange: setKeyword,
        },
      }}
    >
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
        data={filteredRows}
        loading={loading}
        pagination={false}
        scroll={{ x: 970 }}
        emptyText={`当前时间范围内暂无 ${metricLabel} 计量数据`}
      />
    </TableSectionFrame>
  );
}
