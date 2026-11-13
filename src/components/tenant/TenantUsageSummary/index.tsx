import { useQuery } from "@tanstack/react-query";
import {
  getTenantUsage,
  listQuotaDefinitionOptions,
  planKeys,
  type QuotaDefinition,
  type TenantUsage,
} from "@/api/plans";
import {
  ToolbarIconButton,
  ResourceIdentity,
  DataTable,
  type ListColumn,
} from "@/components/common";
import { QuotaEnforcementBadge } from "@/components/tenant/QuotaEnforcementBadge";
import { formatQuotaValue } from "../quota-display";
import { withId } from "@/lib/id";

interface TenantUsageSummaryProps {
  tenantId: number;
}

type TenantUsageQuota = NonNullable<TenantUsage["quotas"]>[number] &
  Pick<QuotaDefinition, "unit" | "accountingKind" | "enforcement"> & { displayName: string };

const accountingLabels: Record<NonNullable<QuotaDefinition["accountingKind"]>, string> = {
  ACCOUNTING_KIND_UNSPECIFIED: "未指定",
  CONCURRENT: "占用型",
  COUNTER: "累计型",
};

const columns: ListColumn<TenantUsageQuota>[] = [
  {
    key: "displayName",
    dataIndex: "displayName",
    title: "配额项",
    width: 200,
    fixed: "left",
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
    dataIndex: "enforcement",
    title: "状态",
    width: 120,
    render: (_, row) => <QuotaEnforcementBadge enforcement={row.enforcement} />,
  },
  {
    key: "quotaValue",
    dataIndex: "quotaValue",
    title: "配额上限",
    width: 200,
    ellipsis: true,
    render: (_, row) => formatQuotaValue(row.quotaValue, row.unit),
  },
  {
    key: "accountingKind",
    dataIndex: "accountingKind",
    title: "计量方式",
    width: 140,
    ellipsis: true,
    render: (value: TenantUsageQuota["accountingKind"]) =>
      value ? (accountingLabels[value] ?? value) : "-",
  },
];

export function TenantUsageSummary({ tenantId }: TenantUsageSummaryProps) {
  const query = useQuery({
    queryKey: planKeys.tenantUsage(tenantId),
    queryFn: ({ signal }) => getTenantUsage(tenantId, signal),
    meta: {
      errorNotification: {
        id: withId("tenant-usage", tenantId),
        action: "套餐配额加载",
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
  const data: TenantUsageQuota[] = (query.data?.quotas ?? []).map((quota) => {
    const definition = catalog.data?.items?.find((item) => item.code === quota.quotaCode);
    const name = definition?.displayName;
    return {
      ...quota,
      displayName: name || quota.quotaCode || "-",
      unit: definition?.unit,
      accountingKind: definition?.accountingKind,
      enforcement: definition?.enforcement,
    };
  });
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
      tableLabel="套餐配额"
      rowKey="quotaCode"
      columns={columns}
      data={data}
      loading={query.isPending}
      pagination={false}
    />
  );
}
