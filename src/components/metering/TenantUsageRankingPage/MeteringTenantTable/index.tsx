import { Button, Input, Select, Space } from "@arco-design/web-react";
import type { ResourceUsageOrder, ResourceUsageTenantRow } from "@/api/resource-usage";
import { ListDataTable, ResourceNameId, type ListColumn } from "@/components/common";
import { UsageQuality, UsageShare, UsageValue } from "../../MeteringPresentation";
import styles from "../../MeteringPresentation/index.module.less";

interface MeteringTenantTableProps {
  rows: ResourceUsageTenantRow[];
  total?: string;
  stepSeconds?: number;
  metricLabel: string;
  unit: string;
  keyword: string;
  order: ResourceUsageOrder;
  onKeywordChange: (keyword: string) => void;
  onOrderChange: (order: ResourceUsageOrder) => void;
  pagination: {
    page: number;
    pageSize: number;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
  };
  loading: boolean;
  onViewDetail: (tenant: ResourceUsageTenantRow) => void;
}

export function MeteringTenantTable({
  rows,
  total,
  stepSeconds,
  metricLabel,
  unit,
  keyword,
  order,
  onKeywordChange,
  onOrderChange,
  pagination,
  loading,
  onViewDetail,
}: MeteringTenantTableProps) {
  const columns: ListColumn<ResourceUsageTenantRow>[] = [
    {
      title: "排名",
      dataIndex: "rank",
      width: 70,
      render: (value) => (value == null ? "-" : <span className={styles.rank}>{value}</span>),
    },
    {
      title: "租户名称 / ID",
      width: 200,
      ellipsis: true,
      render: (_, row) => (
        <ResourceNameId
          name={row.tenantName}
          id={String(row.tenantId)}
          avatarText={row.tenantName}
        />
      ),
    },
    {
      title: "周期平均值（" + unit + "）",
      width: 180,
      render: (_, row) => (
        <UsageValue value={row.usage.mean} knownValue={row.usage.knownMean} unit={unit} />
      ),
    },
    {
      title: "周期采样峰值（" + unit + "）",
      width: 180,
      render: (_, row) => (
        <UsageValue value={row.usage.peak} knownValue={row.usage.knownPeak} unit={unit} />
      ),
    },
    {
      title: "占比",
      width: 185,
      render: (_, row) => <UsageShare share={row.share} />,
    },
    {
      title: "数据完整性",
      width: 120,
      render: (_, row) => <UsageQuality quality={row.usage.quality} />,
    },
    {
      title: "操作",
      width: 110,
      fixed: "right",
      render: (_, row) => (
        <Button type="text" size="small" onClick={() => onViewDetail(row)}>
          查看明细
        </Button>
      ),
    },
  ];

  return (
    <section className={styles.panel}>
      <ListDataTable
        header={{
          title: "",
          description: metricLabel + " · 按周期平均实际用量排序；观测不完整时不参与排名",
          className: styles.panelHead,
          extra: (
            <Space wrap>
              <Select
                aria-label="排行排序"
                value={order}
                onChange={onOrderChange}
                options={[
                  { value: "desc", label: "平均用量从高到低" },
                  { value: "asc", label: "平均用量从低到高" },
                ]}
              />
              <Input.Search
                aria-label="搜索租户名称或 ID"
                allowClear
                value={keyword}
                onChange={onKeywordChange}
                placeholder="搜索租户名称或 ID"
              />
            </Space>
          ),
        }}
        rowKey={(row) => String(row.tenantId)}
        columns={columns}
        data={rows}
        loading={loading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: Number(total ?? "0"),
          onPageChange: pagination.setPage,
          onPageSizeChange: pagination.setPageSize,
        }}
        scroll={{ x: 1045 }}
        emptyText={"当前筛选范围内暂无 " + metricLabel + " 使用统计"}
      />
      <div className={styles.tableFoot}>
        占比以同周期全平台租户平均实际用量为分母，不随搜索或分页变化；数据不完整时显示未知。
        {stepSeconds !== undefined && "周期峰值按 " + stepSeconds + " 秒采样网格计算。"}
      </div>
    </section>
  );
}
