import { Button, Descriptions } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { getTenantUsage, planKeys, type TenantUsage } from "@/api/plans";
import { DataTable, type ListColumn } from "@/components/common";
import { withId } from "@/lib/id";

interface TenantUsageSummaryProps {
  tenantId: number;
}

type TenantUsageQuota = NonNullable<TenantUsage["quotas"]>[number];

const columns: ListColumn<TenantUsageQuota>[] = [
  {
    key: "quotaCode",
    dataIndex: "quotaCode",
    title: "配额编码",
    width: 240,
    ellipsis: true,
  },
  {
    key: "quotaValue",
    dataIndex: "quotaValue",
    title: "套餐上限",
    width: 200,
    ellipsis: true,
  },
];

export function TenantUsageSummary({ tenantId }: TenantUsageSummaryProps) {
  const query = useQuery({
    queryKey: planKeys.tenantUsage(tenantId),
    queryFn: ({ signal }) => getTenantUsage(tenantId, signal),
    meta: {
      errorNotification: {
        id: withId("tenant-usage", tenantId),
        action: "租户用量加载",
      },
    },
  });

  return (
    <div className="flex flex-col gap-5">
      <Descriptions
        column={{ xs: 1, md: 2 }}
        data={[
          { label: "租户 ID", value: String(tenantId) },
          { label: "订阅套餐", value: query.data?.planName ?? "-" },
          { label: "套餐 ID", value: query.data?.planId ?? "-" },
          { label: "当前用户数", value: query.data?.userCount ?? "-" },
          { label: "存储统计占位值（字节）", value: query.data?.storageUsedBytes ?? "-" },
          { label: "API 审计记录数", value: query.data?.apiCallCount ?? "-" },
        ]}
      />
      <p className="m-0 text-sm text-[var(--color-text-3)]">
        存储统计当前固定为 0，并非真实存储用量；API 审计记录数是事后聚合结果，不代表计费周期用量。
      </p>
      <DataTable
        header={{
          title: "套餐配额上限",
          description: "这里只展示套餐配置，实际占用与执行级别请查看配额账户。",
          extra: (
            <Button loading={query.isFetching} onClick={() => query.refetch()}>
              刷新
            </Button>
          ),
        }}
        tableLabel="租户套餐配额上限"
        rowKey="quotaCode"
        columns={columns}
        data={query.data?.quotas ?? []}
        loading={query.isPending}
        pagination={false}
      />
    </div>
  );
}
