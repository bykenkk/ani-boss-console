import { Button, Descriptions } from "@arco-design/web-react";
import clsx from "clsx";
import { DataTable, type ListColumn } from "@/components/common";
import type { TenantBilling } from "../../model";

import type { TenantBillingAdjustment } from "../../model";
import { formatUsd } from "../../formatters";
import { formatDateTimeMinute } from "@/lib/date";
interface BillingCreditProps {
  billing: TenantBilling;
}
const adjustmentColumns: ListColumn<TenantBillingAdjustment>[] = [
  {
    title: "时间",
    dataIndex: "at",
    width: 180,
    render: (value: string) => formatDateTimeMinute(value),
  },
  {
    title: "金额（USD）",
    width: 160,
    render: (_, item) => (
      <span
        className={clsx(
          item.amountUsd >= 0 && "text-green-600",
          item.amountUsd < 0 && "text-red-600",
        )}
      >
        {item.amountUsd > 0 ? "+" : ""}
        {formatUsd(item.amountUsd)}
      </span>
    ),
  },
  { title: "原因", width: 240, dataIndex: "reason" },
  { title: "操作人", dataIndex: "by", width: 150 },
];

export function BillingCredit({ billing }: BillingCreditProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" disabled title="账务功能未接入">
          授信调账
        </Button>
      </div>
      <Descriptions
        border
        column={2}
        data={[
          { label: "授信额度", value: formatUsd(billing.creditUsd) },
          { label: "账户余额", value: formatUsd(billing.balanceUsd) },
        ]}
      />
      <DataTable
        rowKey="id"
        columns={adjustmentColumns}
        data={billing.adjustments}
        pagination={false}
        noDataElement="暂无调账记录"
      />
    </div>
  );
}
