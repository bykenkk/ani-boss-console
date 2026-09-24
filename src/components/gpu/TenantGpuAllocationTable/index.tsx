import { Progress, Tooltip } from "@arco-design/web-react";
import { ResourceNameId, ListDataTable, type ListColumn } from "@/components/common";
import type { TenantGpuAllocation } from "@/api/gpu-inventory";

interface TenantGpuAllocationTableProps {
  data: TenantGpuAllocation[];
  loading: boolean;
  emptyText?: string;
  onEditQuota: (tenant: TenantGpuAllocation) => void;
  onEditReservation: (tenant: TenantGpuAllocation) => void;
}

export function TenantGpuAllocationTable({
  data,
  loading,
  emptyText = "暂无租户 GPU 分配数据",
  onEditQuota,
  onEditReservation,
}: TenantGpuAllocationTableProps) {
  const columns: ListColumn<TenantGpuAllocation>[] = [
    {
      title: "租户",
      width: 200,
      render: (_, tenant) => (
        <ResourceNameId
          avatarText={tenant.tenantName}
          name={tenant.tenantName}
          id={tenant.tenantId}
        />
      ),
    },
    {
      title: "配额上限",
      dataIndex: "quotaTotal",
      width: 80,
      ellipsis: true,
    },
    {
      title: "资源预留",
      dataIndex: "allocatedGpuCount",
      width: 80,
      ellipsis: true,
    },
    {
      title: "已用",
      dataIndex: "used",
      width: 80,
      ellipsis: true,
    },
    {
      title: "处理中",
      dataIndex: "reserved",
      width: 80,
      ellipsis: true,
    },
    {
      title: "可创建",
      dataIndex: "available",
      width: 80,
      ellipsis: true,
    },
    {
      title: "使用率",
      width: 180,
      render: (_, tenant) => {
        if (tenant.quotaTotal <= 0) return "-";
        const percent = ((tenant.used + tenant.reserved) / tenant.quotaTotal) * 100;
        return (
          <Tooltip content="（已用 + 处理中）/ 配额上限；资源预留单独展示">
            <div className="flex items-center gap-2">
              <Progress
                percent={Math.max(0, Math.min(100, percent))}
                showText={false}
                strokeWidth={6}
                color="#2b5ce6"
              />
              <strong className="shrink-0 whitespace-nowrap text-xs tabular-nums">
                {percent.toFixed(1)}%
              </strong>
            </div>
          </Tooltip>
        );
      },
    },
  ];

  return (
    <ListDataTable
      tableLabel="租户 GPU 分配台账"
      rowKey="tenantId"
      columns={columns}
      rowActions={[
        {
          key: "edit-reservation",
          label: "调整资源预留",
          onClick: onEditReservation,
        },
        {
          key: "edit-quota",
          label: "调整配额上限",
          onClick: onEditQuota,
        },
      ]}
      data={data}
      loading={loading}
      pagination="client"
      emptyText={emptyText}
    />
  );
}
