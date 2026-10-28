import { Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { listTenantQuotaSummaries, quotaKeys } from "@/api/quota";
import { ListPageFrame, SummaryStrip } from "@/components/common";
import { TenantSelect } from "@/components/tenant/TenantSelect";
import { useListPagination } from "@/hooks/useListPagination";
import { withId } from "@/lib/id";
import { formatQuotaUnits, type GpuQuotaCode } from "../quota";
import { TenantGpuAllocationTable } from "../TenantGpuAllocationTable";

export function GpuQuotaPage() {
  const [quotaCode, setQuotaCode] = useState<GpuQuotaCode>("gpu.physical.count");
  const [tenantId, setTenantId] = useState<number>();
  const pagination = useListPagination(`${quotaCode}/${tenantId ?? "all"}`);
  const params = { page: pagination.page, pageSize: pagination.pageSize, tenantId, quotaCode };
  const query = useQuery({
    queryKey: quotaKeys.summaries(params),
    queryFn: ({ signal }) => listTenantQuotaSummaries(params, signal),
    meta: {
      errorNotification: {
        id: withId("tenant-quota-summaries", quotaCode),
        action: "租户 GPU 配额加载",
      },
    },
  });
  const summary = query.data?.summary;
  const totals = summary?.accounts.find((account) => account.quotaCode === quotaCode);
  const unit = quotaCode === "gpu.physical.count" ? "张" : "GiB";
  const scope = tenantId === undefined ? "全平台；不随翻页变化" : "当前租户";

  return (
    <ListPageFrame
      summary={
        <SummaryStrip
          pending={query.isLoading}
          items={[
            {
              label: "已配置配额租户",
              value: formatQuotaUnits(summary?.configuredTenantCount),
              unit: "个",
              note: scope,
            },
            { label: "配额上限合计", value: formatQuotaUnits(totals?.limit, quotaCode), unit },
            { label: "配额占用合计", value: formatQuotaUnits(totals?.occupied, quotaCode), unit },
            { label: "剩余配额合计", value: formatQuotaUnits(totals?.available, quotaCode), unit },
          ]}
        />
      }
      header={{
        title: "GPU 配额",
        subtitle:
          "按租户查看整卡与共享显存配额。占用包含已受理的资源请求；剩余配额不代表实际可创建容量。",
        actions: [
          {
            key: "refresh",
            label: "刷新",
            variant: "secondary",
            disabled: query.isFetching,
            onClick: () => query.refetch(),
          },
        ],
      }}
      tabs={{
        items: [
          { value: "gpu.physical.count", label: "整卡" },
          { value: "gpu.shared_memory_mib", label: "共享显存" },
        ],
        value: quotaCode,
        onChange: setQuotaCode,
        ariaLabel: "GPU 配额类型",
      }}
      toolbar={{
        filters: (
          <Space>
            <TenantSelect value={tenantId} onChange={setTenantId} />
          </Space>
        ),
      }}
    >
      <TenantGpuAllocationTable
        data={query.data?.items ?? []}
        quotaCode={quotaCode}
        loading={query.isLoading}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: Number(query.data?.total ?? 0),
          onPageChange: pagination.setPage,
          onPageSizeChange: pagination.setPageSize,
        }}
      />
    </ListPageFrame>
  );
}
