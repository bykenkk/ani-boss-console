import { Button, Descriptions, Result } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import {
  DetailPageFrame,
  type DetailInfoCard,
  type DetailTab,
  StatusBadge,
} from "@/components/common";
import { tenantBillingDemoData } from "../demo";
import { tenantBillingStatusMeta } from "../model";
import { formatDate, formatDateTimeMinute, formatMonth } from "@/lib/date";
import { formatUsd } from "../formatters";
import { BillingUsage } from "./BillingUsage";
import { BillingInvoices } from "./BillingInvoices";
import { BillingCredit } from "./BillingCredit";
import { BillingOperations } from "./BillingOperations";
interface TenantBillingDetailProps {
  tenantId: string;
}
export function TenantBillingDetail({ tenantId }: TenantBillingDetailProps) {
  const navigate = useNavigate();
  const billing = tenantBillingDemoData.find((item) => item.tenantId === tenantId);
  const returnToList = () => {
    navigate({ to: "/tenants-billing" });
  };
  if (!billing)
    return (
      <Result
        status="info"
        title="账务功能未接入"
        subTitle="当前仅提供演示数据，尚无该租户的真实账务信息。"
        extra={<Button onClick={returnToList}>返回计费列表</Button>}
      />
    );
  const status = tenantBillingStatusMeta[billing.status];
  const infoCards: DetailInfoCard[] = [
    {
      key: "account",
      title: "计费账户",
      content: (
        <Descriptions
          column={1}
          data={[
            { label: "租户 ID", value: billing.tenantId },
            { label: "接入状态", value: "未接入（演示数据）" },
            { label: "租户显示名", value: billing.tenantDisplayName },
            {
              label: "状态",
              value: <StatusBadge tone={status.tone} value={status.label} />,
            },
            { label: "账期", value: formatMonth(billing.period) },
            { label: "本期用量费用", value: formatUsd(billing.usageCostUsd) },
            {
              label: "账户余额",
              value: (
                <span className={clsx(billing.balanceUsd < 0 && "text-red-600")}>
                  {formatUsd(billing.balanceUsd)}
                </span>
              ),
            },
            { label: "授信额度", value: formatUsd(billing.creditUsd) },
            { label: "到期日", value: formatDate(billing.dueDate) },
            { label: "账单号", value: billing.invoiceNo ?? "-" },
            { label: "最近更新", value: formatDateTimeMinute(billing.updatedAt) },
          ]}
        />
      ),
    },
  ];

  const detailTabs: DetailTab[] = [
    { key: "usage", title: "用量明细", content: <BillingUsage billing={billing} /> },
    { key: "bills", title: "账单", content: <BillingInvoices billing={billing} /> },
    { key: "credit", title: "授信与调账", content: <BillingCredit billing={billing} /> },
    {
      key: "operations",
      title: "操作历史",
      content: <BillingOperations records={billing.operations} />,
    },
  ];
  return (
    <DetailPageFrame
      breadcrumbs={[
        { label: "租户管理" },
        { label: "租户计费与用量", onClick: returnToList },
        { label: billing.tenantName },
      ]}
      title={billing.tenantDisplayName}
      subtitle={`${billing.tenantName} · 账务功能未接入，当前为演示数据`}
      status={<StatusBadge tone={status.tone} value={status.label} />}
      headerItems={[
        { label: "账期", value: formatMonth(billing.period) },
        { label: "本期用量费用", value: formatUsd(billing.usageCostUsd) },
        { label: "账户余额", value: formatUsd(billing.balanceUsd) },
        { label: "到期日", value: formatDate(billing.dueDate) },
      ]}
      cards={infoCards}
      tabs={detailTabs}
      defaultTabKey="usage"
      onBack={returnToList}
    />
  );
}
