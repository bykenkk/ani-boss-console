import { Progress, Tooltip } from "@arco-design/web-react";
import type { TenantQuotaSummary } from "@/api/quota";
import {
  ResourceIdentity,
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

interface TenantGpuAllocationRow extends TenantQuotaSummary {
  quotaLimit?: string;
  quotaOccupied?: string;
  quotaAvailable?: string;
}

export function TenantGpuAllocationTable({
  data,
  quotaCode,
  loading,
  pagination,
}: TenantGpuAllocationTableProps) {
  const account = (tenant: TenantQuotaSummary) =>
    tenant.accounts?.find((item) => item.quotaCode === quotaCode);
  const unit = quotaCode === "gpu.physical.count" ? "张" : "GiB";
  const rows: TenantGpuAllocationRow[] = data.map((tenant) => {
    const current = account(tenant);
    return {
      ...tenant,
      quotaLimit:
        current?.configured === false || current?.limit === undefined
          ? undefined
          : formatQuotaUnits(current.limit, quotaCode),
      quotaOccupied:
        current?.occupied === undefined ? undefined : formatQuotaUnits(current.occupied, quotaCode),
      quotaAvailable:
        current?.configured === false || current?.available === undefined
          ? undefined
          : formatQuotaUnits(current.available, quotaCode),
    };
  });
  const columns: ListColumn<TenantGpuAllocationRow>[] = [
    {
      key: "name",
      title: "租户",
      width: 200,
      fixed: "left",
      render: (_, tenant) => (
        <ResourceIdentity name={tenant.tenantName || tenant.tenantCode} id={tenant.tenantId} />
      ),
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
    { title: "所属套餐", dataIndex: "planName", width: 160, ellipsis: true },
    {
      title: "配额占用率",
      width: 100,
      align: "center",
      render: (_, tenant) => {
        const current = account(tenant);
        if (current?.configured === false) return "-";
        const limit = quotaInteger(current?.limit);
        const occupied = quotaInteger(current?.occupied);
        const percent =
          current?.configured === true &&
          limit !== undefined &&
          occupied !== undefined &&
          limit > 0n
            ? Number((occupied * 1000n) / limit) / 10
            : undefined;
        const overLimit =
          current?.configured === true && limit === 0n && occupied !== undefined && occupied > 0n;
        const text = overLimit
          ? "超限"
          : percent === undefined
            ? undefined
            : `${Number(percent.toFixed(1))}%`;
        return (
          <Tooltip content="配额占用 / 配额上限；不代表 GPU 实际利用率">
            <Progress
              type="circle"
              width={40}
              strokeWidth={3}
              percent={overLimit ? 100 : Math.min(100, percent ?? 0)}
              showText={text !== undefined}
              formatText={() => (
                <span className="text-[10px] whitespace-nowrap tabular-nums">{text}</span>
              )}
            />
          </Tooltip>
        );
      },
    },
    { title: `配额上限（${unit}）`, dataIndex: "quotaLimit", width: 160 },
    { title: `配额占用（${unit}）`, dataIndex: "quotaOccupied", width: 160 },
    { title: `剩余配额（${unit}）`, dataIndex: "quotaAvailable", width: 160 },
  ];
  return (
    <ListDataTable
      tableLabel="租户 GPU 配额"
      rowKey={(tenant) => String(tenant.tenantId)}
      columns={columns}
      data={rows}
      loading={loading}
      pagination={pagination}
    />
  );
}
