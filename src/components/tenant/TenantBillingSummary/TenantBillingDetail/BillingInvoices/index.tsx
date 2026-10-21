import { Button, Modal } from "@arco-design/web-react";
import { DataTable, type ListColumn } from "@/components/common";
import type { TenantBilling } from "@/components/tenant/model";

import { StatusBadge } from "@/components/common";
import type { TenantInvoice } from "@/components/tenant/model";
import { formatUsd } from "../../formatters";
import { formatDate, formatMonth } from "@/lib/date";
import { useTenantBillingActions } from "@/hooks/useTenantBillingActions";
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
  const runAction = useTenantBillingActions();
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="primary"
          disabled={billing.usageCostUsd <= 0}
          onClick={() =>
            Modal.confirm({
              title: "生成账单",
              content:
                "确认按 " +
                billing.tenantName +
                " 本期用量费用 " +
                formatUsd(billing.usageCostUsd) +
                " 生成账单？",
              onOk: () => {
                runAction(billing.tenantId, "generate_invoice");
              },
            })
          }
        >
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
            disabled: () => billing.status !== "overdue" && billing.balanceUsd >= 0,
            onClick: () =>
              Modal.confirm({
                title: "标记结清",
                content: "确认 " + billing.tenantName + " 该账期已完成线下结算并标记结清？",
                onOk: () => {
                  runAction(billing.tenantId, "mark_settled");
                },
              }),
          },
          {
            key: "export-statement",
            label: "导出对账单",
            onClick: () => {
              runAction(billing.tenantId, "export_statement");
            },
          },
        ]}
      />
    </div>
  );
}
