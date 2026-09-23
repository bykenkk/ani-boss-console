import { DataTableNameCell, ListDataTable, type ListColumn } from "@/components/common";
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
      width: 260,
      render: (_, tenant) => <DataTableNameCell name={tenant.tenantName} id={tenant.tenantId} />,
    },
    { title: "配额上限", dataIndex: "quotaTotal", width: 110 },
    { title: "资源预留", dataIndex: "allocatedGpuCount", width: 110 },
    { title: "已用", dataIndex: "used", width: 90 },
    { title: "处理中", dataIndex: "reserved", width: 90 },
    { title: "可创建", dataIndex: "available", width: 90 },
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
      pagination={false}
      emptyText={emptyText}
    />
  );
}
