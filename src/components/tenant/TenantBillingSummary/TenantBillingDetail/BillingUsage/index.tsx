import { Button, Modal } from "@arco-design/web-react";
import { DataTable, type ListColumn } from "@/components/common";
import type { TenantBilling } from "@/components/tenant/model";

import type { TenantUsageCost } from "@/components/tenant/model";
import { formatAmount, formatUsd } from "../../formatters";
import { formatMonth } from "@/lib/date";
import { useTenantBillingActions } from "@/hooks/useTenantBillingActions";
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
  const runAction = useTenantBillingActions();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() =>
            Modal.confirm({
              title: "刷新用量",
              content:
                "确认刷新 " +
                billing.tenantName +
                " " +
                formatMonth(billing.period) +
                " 账期的用量与费用？",
              onOk: () => {
                runAction(billing.tenantId, "refresh_usage");
              },
            })
          }
        >
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
