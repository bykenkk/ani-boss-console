import { Button, Descriptions } from "@arco-design/web-react";
import { useState } from "react";
import clsx from "clsx";
import { DataTable, type ListColumn } from "@/components/common";
import type { TenantBilling } from "@/components/tenant/model";

import type { TenantBillingAdjustment } from "@/components/tenant/model";
import { formatUsd } from "../../formatters";
import { formatDateTimeMinute } from "@/lib/date";
import { CreditAdjustmentModal } from "../../CreditAdjustmentModal";
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
  const [adjustVisible, setAdjustVisible] = useState(false);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button type="primary" onClick={() => setAdjustVisible(true)}>
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
      {adjustVisible ? (
        <CreditAdjustmentModal
          tenantId={billing.tenantId}
          onCancel={() => setAdjustVisible(false)}
          onSuccess={() => setAdjustVisible(false)}
        />
      ) : null}
    </div>
  );
}
