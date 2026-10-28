import { Progress, Tooltip } from "@arco-design/web-react";
import type { TenantQuotaSummary } from "@/api/quota";
import {
  ResourceNameId,
  ListDataTable,
  StatusBadge,
  type ListColumn,
  type ListPagination,
} from "@/components/common";
import { formatQuotaUnits, quotaInteger, type GpuQuotaCode } from "../quota";

interface TenantGpuAllocationTableProps {
  data: TenantQuotaSummary[];
  quotaCode: GpuQuotaCode;
  loading: boolean;
  pagination: ListPagination;
}

export function TenantGpuAllocationTable({
  data,
  quotaCode,
  loading,
  pagination,
}: TenantGpuAllocationTableProps) {
  const account = (tenant: TenantQuotaSummary) =>
    tenant.accounts?.find((a) => a.quotaCode === quotaCode);
  const unit = quotaCode === "gpu.physical.count" ? "张" : "GiB";
  const columns: ListColumn<TenantQuotaSummary>[] = [
    {
      key: "name",
      title: "租户",
      width: 200,
      render: (_, tenant) => (
        <ResourceNameId
          avatarText={tenant.tenantName || tenant.tenantCode}
          name={tenant.tenantName || tenant.tenantCode}
          id={String(tenant.tenantId)}
        />
      ),
    },
    { title: "所属套餐", dataIndex: "planName", width: 160, ellipsis: true },
    {
      title: `配额上限（${unit}）`,
      width: 160,
      render: (_, tenant) =>
        account(tenant)?.configured === false
          ? "未配置"
          : formatQuotaUnits(account(tenant)?.limit, quotaCode),
    },
    {
      title: `配额占用（${unit}）`,
      width: 160,
      render: (_, tenant) => formatQuotaUnits(account(tenant)?.occupied, quotaCode),
    },
    {
      title: `剩余配额（${unit}）`,
      width: 160,
      render: (_, tenant) =>
        account(tenant)?.configured === false
          ? "未配置"
          : formatQuotaUnits(account(tenant)?.available, quotaCode),
    },
    {
      title: "配额占用率",
      width: 180,
      render: (_, tenant) => {
        const current = account(tenant);
        const limit = quotaInteger(current?.limit);
        const occupied = quotaInteger(current?.occupied);
        if (current?.configured !== true || limit === undefined || occupied === undefined)
          return "-";
        if (limit === 0n) return occupied > 0n ? "超限" : "-";
        const percent = Number((occupied * 1000n) / limit) / 10;
        return (
          <Tooltip content="配额占用 / 配额上限；不代表 GPU 实际利用率">
            <div className="flex items-center gap-2">
              <Progress percent={Math.min(100, percent)} showText={false} strokeWidth={6} />
              <strong className="shrink-0 whitespace-nowrap text-xs tabular-nums">
                {percent.toFixed(1)}%
              </strong>
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: "配置状态",
      width: 120,
      render: (_, tenant) => {
        const current = account(tenant);
        return (
          <StatusBadge
            value={
              current?.configured === undefined
                ? "未知"
                : current.configured === false
                  ? "未配置"
                  : current.overLimit
                    ? "超限"
                    : "已配置"
            }
            tone={current?.overLimit ? "danger" : current?.configured ? "success" : "default"}
          />
        );
      },
    },
  ];
  return (
    <ListDataTable
      tableLabel="租户 GPU 配额"
      rowKey={(tenant) => String(tenant.tenantId)}
      columns={columns}
      data={data}
      loading={loading}
      pagination={pagination}
    />
  );
}
