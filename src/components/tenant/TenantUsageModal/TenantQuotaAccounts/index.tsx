import { Button } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { getTenantQuotaAccounts, planKeys, type QuotaAccount } from "@/api/plans";
import { DataTable, StatusBadge, type ListColumn } from "@/components/common";
import { QuotaEnforcementBadge } from "@/components/tenant/QuotaEnforcementBadge";
import { withId } from "@/lib/id";

interface TenantQuotaAccountsProps {
  tenantId: number;
}

const columns: ListColumn<QuotaAccount>[] = [
  {
    key: "quotaCode",
    dataIndex: "quotaCode",
    title: "配额编码",
    width: 240,
    ellipsis: true,
  },
  { key: "unit", dataIndex: "unit", title: "单位", width: 100, ellipsis: true },
  { key: "limit", dataIndex: "limit", title: "上限", width: 180, ellipsis: true },
  { key: "occupied", dataIndex: "occupied", title: "占用", width: 180, ellipsis: true },
  { key: "available", dataIndex: "available", title: "可用", width: 180, ellipsis: true },
  {
    key: "overLimit",
    title: "状态",
    width: 120,
    render: (_, row) => (
      <StatusBadge
        value={row.overLimit === undefined ? undefined : row.overLimit ? "超限" : "未超限"}
        tone={row.overLimit ? "danger" : "success"}
      />
    ),
  },
  {
    key: "enforcement",
    title: "执行级别",
    width: 160,
    render: (_, row) => <QuotaEnforcementBadge enforcement={row.enforcement} />,
  },
];

export function TenantQuotaAccounts({ tenantId }: TenantQuotaAccountsProps) {
  const query = useQuery({
    queryKey: planKeys.tenantQuotaAccounts(tenantId),
    queryFn: ({ signal }) => getTenantQuotaAccounts(tenantId, signal),
    meta: {
      errorNotification: {
        id: withId("tenant-quota-accounts", tenantId),
        action: "租户配额账户加载",
      },
    },
  });

  return (
    <DataTable
      header={{
        title: "配额账户",
        description:
          "未配置的上限为 0；只有实际拦截的配额项会限制资源创建。仅配置与实验级别不能视为已启用额度拦截。",
        extra: (
          <Button loading={query.isFetching} onClick={() => query.refetch()}>
            刷新
          </Button>
        ),
      }}
      tableLabel="租户配额账户"
      rowKey="quotaCode"
      columns={columns}
      data={query.data?.items ?? []}
      loading={query.isPending}
      pagination={false}
    />
  );
}
