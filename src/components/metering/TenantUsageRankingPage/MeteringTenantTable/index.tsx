import { Button, Input, Select } from "@arco-design/web-react";
import { useState } from "react";
import { ListDataTable, ResourceNameId, type ListColumn } from "@/components/common";
import type { TenantListItem } from "@/api/tenant";
import { formatUsage, type MeteringTenantRow } from "@/lib/metering";
import { UsageChange, UsageShare } from "../../MeteringPresentation";
import styles from "../../MeteringPresentation/index.module.less";
interface MeteringTenantTableProps {
  rows: MeteringTenantRow[];
  tenants: TenantListItem[];
  metricLabel: string;
  unit: string;
  periodLabel: string;
  previousLabel: string;
  loading: boolean;
  onViewDetail: (tenantId: string) => void;
}
export function MeteringTenantTable({
  rows,
  tenants,
  metricLabel,
  unit,
  periodLabel,
  previousLabel,
  loading,
  onViewDetail,
}: MeteringTenantTableProps) {
  const [keyword, setKeyword] = useState("");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const names = new Map(tenants.map((tenant) => [tenant.id, tenant.displayName || tenant.name]));
  const total = rows.reduce((sum, row) => sum + row.current, 0);
  const rankedRows = [...rows]
    .filter((row) => row.current > 0 || row.previous > 0)
    .sort((left, right) => right.current - left.current)
    .map((row, index) => ({ ...row, rank: index + 1 }));
  const filtered = rankedRows.filter((row) =>
    `${row.id} ${names.get(row.id) || ""}`.toLowerCase().includes(keyword.trim().toLowerCase()),
  );
  if (order === "asc") filtered.reverse();
  const columns: ListColumn<(typeof rankedRows)[number]>[] = [
    {
      title: "排名",
      width: 65,
      render: (_, row) => <span className={styles.rank}>{row.rank}</span>,
    },
    {
      title: "租户",
      width: 250,
      render: (_, row) => (
        <ResourceNameId
          name={names.get(row.id) || row.id}
          id={row.id}
          avatarText={names.get(row.id) || row.id}
        />
      ),
    },
    {
      title: `${periodLabel}用量`,
      width: 155,
      render: (_, row) => (
        <strong>
          {formatUsage(row.current)}
          <small className={styles.unit}>{unit}</small>
        </strong>
      ),
    },
    {
      title: "占比",
      width: 185,
      render: (_, row) => <UsageShare value={row.current} total={total} />,
    },
    {
      title: previousLabel,
      width: 155,
      render: (_, row) => (
        <span>
          {formatUsage(row.previous)}
          <small className={styles.unit}>{unit}</small>
        </span>
      ),
    },
    {
      title: "环比",
      width: 90,
      render: (_, row) => <UsageChange current={row.current} previous={row.previous} />,
    },
    {
      title: "操作",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Button type="text" size="small" onClick={() => onViewDetail(row.id)}>
          查看明细
        </Button>
      ),
    },
  ];
  return (
    <section className={styles.panel}>
      <ListDataTable
        header={{
          title: "租户排行",
          description: `按${periodLabel} ${metricLabel} 用量${order === "desc" ? "降" : "升"}序 · 共 ${rows.filter((row) => row.current > 0).length} 个租户产生用量`,
          className: styles.panelHead,
          extra: (
            <div className={styles.tools}>
              <Select
                aria-label="排行排序"
                value={order}
                onChange={(value) => {
                  setOrder(value);
                  setPage(1);
                }}
                options={[
                  { value: "desc", label: "用量从高到低" },
                  { value: "asc", label: "用量从低到高" },
                ]}
              />
              <Input.Search
                aria-label="搜索租户"
                allowClear
                value={keyword}
                onChange={(value) => {
                  setKeyword(value);
                  setPage(1);
                }}
                placeholder="搜索租户名称 / ID"
              />
            </div>
          ),
        }}
        rowKey="id"
        columns={columns}
        data={filtered}
        loading={loading}
        pagination={{
          page,
          pageSize,
          total: filtered.length,
          onPageChange: setPage,
          onPageSizeChange: (value) => {
            setPageSize(value);
            setPage(1);
          },
        }}
        scroll={{ x: 1010 }}
        emptyText={`当前筛选范围内暂无 ${metricLabel} 计量数据`}
      />
      <div className={styles.tableFoot}>
        按资源实际占用时长折算 · 上期用量为 0 且本期有用量时，环比显示「新增」
      </div>
    </section>
  );
}
