import { Button } from "@arco-design/web-react";
import { DataTable, type ListColumn } from "@/components/common";
import type { TenantBilling } from "../../model";

import { StatusBadge } from "@/components/common";
import type { TenantInvoice } from "../../model";
import { formatUsd } from "../../formatters";
import { formatDate, formatMonth } from "@/lib/date";
interface BillingInvoicesProps {
  billing: TenantBilling;
}
const invoiceColumns: ListColumn<TenantInvoice>[] = [
  { title: "账单号", dataIndex: "no", width: 220 },
  {
    title: "账期",
    dataIndex: "period",
    width: 180,
    render: (value: string) => formatMonth(value),
  },
  {
    title: "金额（USD）",
    width: 160,
    render: (_, item) => formatUsd(item.amountUsd),
  },
  {
    title: "状态",
    width: 120,
    render: () => <StatusBadge tone="info" value="已出账" />,
  },
  {
    title: "出账日期",
    dataIndex: "issuedAt",
    width: 180,
    render: (value: string) => formatDate(value),
  },
];

export function BillingInvoices({ billing }: BillingInvoicesProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" disabled title="账务功能未接入">
          生成账单
        </Button>
      </div>
      <DataTable
        rowKey="id"
        columns={invoiceColumns}
        data={billing.invoices}
        pagination={false}
        noDataElement="暂无账单"
        rowActions={[
          {
            key: "mark-settled",
            label: "标记结清",
            disabled: () => true,
            tooltip: "账务功能未接入",
            onClick: () => {},
          },
          {
            key: "export-statement",
            label: "导出对账单",
            disabled: () => true,
            tooltip: "账务功能未接入",
            onClick: () => {},
          },
        ]}
      />
    </div>
  );
}
