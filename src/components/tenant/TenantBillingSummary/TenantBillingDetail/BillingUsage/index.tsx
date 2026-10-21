import { Button } from "@arco-design/web-react";
import { DataTable, type ListColumn } from "@/components/common";
import type { TenantBilling } from "../../model";

import type { TenantUsageCost } from "../../model";
import { formatAmount, formatUsd } from "../../formatters";
interface BillingUsageProps {
  billing: TenantBilling;
}
const usageColumns: ListColumn<TenantUsageCost>[] = [
  { title: "计量项", width: 160, dataIndex: "metric" },
  {
    title: "用量",
    width: 180,
    render: (_, item) => formatAmount(item.amount),
  },
  {
    title: "单价（USD）",
    width: 180,
    render: (_, item) => `$${formatAmount(item.unitCost)}`,
  },
  {
    title: "费用（USD）",
    width: 180,
    render: (_, item) => formatUsd(item.cost),
  },
];

export function BillingUsage({ billing }: BillingUsageProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button disabled title="账务功能未接入">
          刷新用量
        </Button>
      </div>
      <DataTable
        rowKey="metric"
        columns={usageColumns}
        data={billing.usageBreakdown}
        pagination={false}
      />
    </div>
  );
}
