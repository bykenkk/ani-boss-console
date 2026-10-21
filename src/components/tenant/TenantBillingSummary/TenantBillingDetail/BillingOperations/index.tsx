import { DataTable, type ListColumn } from "@/components/common";

import type { TenantBillingOperation } from "@/components/tenant/model";
import { formatDateTimeMinute } from "@/lib/date";
interface BillingOperationsProps {
  records: TenantBillingOperation[];
}
const operationColumns: ListColumn<TenantBillingOperation>[] = [
  { title: "操作", dataIndex: "operation", width: 160 },
  { title: "说明", width: 240, dataIndex: "message" },
  { title: "操作人", dataIndex: "by", width: 150 },
  {
    title: "时间",
    dataIndex: "createdAt",
    width: 180,
    render: (value: string) => formatDateTimeMinute(value),
  },
];

export function BillingOperations({ records }: BillingOperationsProps) {
  return (
    <DataTable
      rowKey="id"
      columns={operationColumns}
      data={records}
      pagination={false}
      noDataElement="暂无操作记录"
    />
  );
}
