import { Typography } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  getTenantQuotaAccounts,
  listQuotaDefinitionOptions,
  planKeys,
  type QuotaAccount,
} from "@/api/plans";
import {
  ToolbarIconButton,
  ResourceIdentity,
  DataTable,
  type ListColumn,
} from "@/components/common";
import { QuotaEnforcementBadge } from "@/components/tenant/QuotaEnforcementBadge";
import { withId } from "@/lib/id";
import { formatQuotaValue } from "../quota-display";

interface TenantQuotaAccountsProps {
  tenantId: number;
}

type TenantQuotaAccountRow = QuotaAccount & { displayName: string };

const columns: ListColumn<TenantQuotaAccountRow>[] = [
  {
    key: "displayName",
    dataIndex: "displayName",
    title: "配额项",
    width: 200,
    ellipsis: true,
    render: (_, row) => (
      <ResourceIdentity
        name={row.displayName}
        id={row.quotaCode}
        idLabel="配额编码"
        openable={false}
      />
    ),
  },
  {
    key: "enforcement",
    title: "状态",
    width: 120,
    render: (_, row) => <QuotaEnforcementBadge enforcement={row.enforcement} />,
  },
  {
    key: "limit",
    dataIndex: "limit",
    title: "配额（可用 / 已用 / 总量）",
    width: 300,
    render: (_, row) =>
      row.configured === false ? (
        <Typography.Text type="secondary">未配置</Typography.Text>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Typography.Text type="success" title="可用配额">
            {formatQuotaValue(row.available)}
          </Typography.Text>
          <Typography.Text type="secondary">/</Typography.Text>
          <Typography.Text type={row.overLimit === true ? "error" : "warning"} title="已用配额">
            {formatQuotaValue(row.occupied)}
          </Typography.Text>
          <Typography.Text type="secondary">/</Typography.Text>
          <Typography.Text className="tabular-nums" title="配额总量">
            {formatQuotaValue(row.limit, row.unit)}
          </Typography.Text>
        </div>
      ),
  },
];

export function TenantQuotaAccounts({ tenantId }: TenantQuotaAccountsProps) {
  const query = useQuery({
    queryKey: planKeys.tenantQuotaAccounts(tenantId),
    queryFn: ({ signal }) => getTenantQuotaAccounts(tenantId, signal),
    meta: {
      errorNotification: {
        id: withId("tenant-quota-accounts", tenantId),
        action: "资源配额加载",
      },
    },
  });
  const catalog = useQuery({
    queryKey: planKeys.quotaDefinitions,
    queryFn: ({ signal }) => listQuotaDefinitionOptions({}, signal),
    meta: {
      errorNotification: { id: "quota-definitions", action: "配额目录加载" },
    },
  });
  const data: TenantQuotaAccountRow[] = (query.data?.items ?? []).map((account) => ({
    ...account,
    displayName:
      catalog.data?.items?.find((definition) => definition.code === account.quotaCode)
        ?.displayName ||
      account.quotaCode ||
      "-",
  }));
  const refreshing = query.isFetching || catalog.isFetching;

  return (
    <DataTable
      header={{
        extra: (
          <ToolbarIconButton
            label="刷新"
            disabled={refreshing}
            spinning={refreshing}
            onClick={async () => {
              await Promise.all([query.refetch(), catalog.refetch()]);
            }}
          />
        ),
      }}
      tableLabel="资源配额"
      rowKey="quotaCode"
      columns={columns}
      data={data}
      loading={query.isPending}
      pagination={false}
    />
  );
}
