import { Button, Descriptions, Result } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import {
  DetailPageFrame,
  type DetailInfoCard,
  type DetailTab,
  StatusBadge,
} from "@/components/common";
import { useTenantManagement } from "@/hooks/useTenantManagement";
import { tenantBillingStatusMeta } from "@/components/tenant/model";
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
  const { tenants, tenantBillings } = useTenantManagement();
  const tenant = tenants.find((item) => item.id === tenantId);
  const billing = tenantBillings.find((item) => item.tenantId === tenantId);
  const returnToList = () => {
    navigate({ to: "/tenants-billing" });
  };
  if (!tenant || !billing)
    return (
      <Result
        status="404"
        title="计费账户不存在"
        subTitle="该租户可能已被移除，或尚未创建计费账户。"
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
            { label: "租户 ID", value: tenant.id },
            { label: "租户显示名", value: tenant.displayName },
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
        { label: tenant.name },
      ]}
      title={tenant.displayName}
      subtitle={tenant.name}
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
