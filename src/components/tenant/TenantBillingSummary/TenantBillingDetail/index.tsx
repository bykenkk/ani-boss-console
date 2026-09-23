import { Button, Descriptions, Modal, Result } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import {
  DataTable,
  DetailPageFrame,
  type DetailInfoCard,
  type DetailTab,
  type ListColumn,
  StatusBadge,
} from "@/components/common";
import { useState } from "react";
import { showMessage } from "@/lib/feedback";
import { CreditAdjustmentModal } from "@/components/tenant/TenantBillingSummary/CreditAdjustmentModal";
import { formatAmount, formatUsd } from "@/components/tenant/TenantBillingSummary/formatters";
import type { TenantBillingAction } from "@/stores/tenant-management";
import { useTenantManagement } from "@/hooks/useTenantManagement";
import {
  tenantBillingStatusMeta,
  type TenantBillingAdjustment,
  type TenantBillingOperation,
  type TenantInvoice,
  type TenantUsageCost,
} from "@/components/tenant/model";
import { formatDate, formatDateTimeMinute, formatMonth } from "@/lib/date";

interface TenantBillingDetailProps {
  tenantId: string;
}

export function TenantBillingDetail({ tenantId }: TenantBillingDetailProps) {
  const navigate = useNavigate();
  const { tenants, tenantBillings, applyTenantBillingAction } = useTenantManagement();
  const [adjustVisible, setAdjustVisible] = useState(false);
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");

  const tenant = tenants.find((item) => item.id === tenantId);
  const billing = tenantBillings.find((item) => item.tenantId === tenantId);

  const returnToList = () => {
    void navigate({ to: "/tenants-billing" });
  };

  if (!tenant || !billing) {
    return (
      <Result
        status="404"
        title="计费账户不存在"
        subTitle="该租户可能已被移除，或尚未创建计费账户。"
        extra={<Button onClick={returnToList}>返回计费列表</Button>}
      />
    );
  }

  const status = tenantBillingStatusMeta[billing.status];

  const showResult = (
    result: { ok: boolean; reason?: string; message?: string },
    success: string,
  ) => {
    if (result.ok) {
      showMessage({ type: "success", content: result.message ?? success });
      return true;
    }
    showMessage({ type: "error", content: result.reason ?? "操作失败" });
    return false;
  };

  const confirmAction = (
    action: Exclude<TenantBillingAction, "adjust_credit" | "export_statement">,
    title: string,
    content: string,
    success: string,
  ) => {
    Modal.confirm({
      title,
      content,
      onOk: () => void showResult(applyTenantBillingAction(tenant.id, action), success),
    });
  };

  const submitAdjustment = () => {
    if (!adjustmentAmount) {
      showMessage({ type: "warning", content: "请输入非零调账金额" });
      return;
    }
    if (
      showResult(
        applyTenantBillingAction(tenant.id, "adjust_credit", {
          amountUsd: adjustmentAmount,
          reason: adjustmentReason,
        }),
        "授信调账已完成",
      )
    ) {
      setAdjustVisible(false);
      setAdjustmentAmount(0);
      setAdjustmentReason("");
    }
  };

  const usageColumns: ListColumn<TenantUsageCost>[] = [
    { title: "计量项", dataIndex: "metric" },
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
    { title: "原因", dataIndex: "reason" },
    { title: "操作人", dataIndex: "by", width: 150 },
  ];

  const invoiceColumns: ListColumn<TenantInvoice>[] = [
    { title: "账单号", dataIndex: "no", width: 220 },
    {
      title: "账期",
      dataIndex: "period",
      width: 130,
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
      width: 150,
      render: (value: string) => formatDate(value),
    },
  ];

  const operationColumns: ListColumn<TenantBillingOperation>[] = [
    { title: "操作", dataIndex: "operation", width: 160 },
    { title: "说明", dataIndex: "message" },
    { title: "操作人", dataIndex: "by", width: 150 },
    {
      title: "时间",
      dataIndex: "createdAt",
      width: 180,
      render: (value: string) => formatDateTimeMinute(value),
    },
  ];

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
    {
      key: "usage",
      title: "用量明细",
      content: (
        <div className="py-4">
          <DataTable
            rowKey="metric"
            columns={usageColumns}
            data={billing.usageBreakdown}
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: "bills",
      title: "账单",
      content: (
        <div className="py-4">
          <DataTable
            rowKey="id"
            columns={invoiceColumns}
            rowActions={[
              {
                key: "mark-settled",
                label: "标记结清",
                disabled: () => billing.status !== "overdue" && billing.balanceUsd >= 0,
                onClick: () =>
                  confirmAction(
                    "mark_settled",
                    "标记结清",
                    "确认该账单已完成线下结算并标记结清？",
                    "账单已结清",
                  ),
              },
              {
                key: "export-statement",
                label: "导出对账单",
                onClick: () => {
                  showResult(
                    applyTenantBillingAction(tenant.id, "export_statement"),
                    "对账单已导出",
                  );
                },
              },
            ]}
            data={billing.invoices}
            pagination={false}
            noDataElement="暂无账单"
          />
        </div>
      ),
    },
    {
      key: "credit",
      title: "授信与调账",
      content: (
        <div className="py-4">
          <Descriptions
            border
            column={2}
            className="mb-4"
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
      ),
    },
    {
      key: "operations",
      title: "操作历史",
      content: (
        <div className="py-4">
          <DataTable
            rowKey="id"
            columns={operationColumns}
            data={billing.operations}
            pagination={false}
            noDataElement="暂无操作记录"
          />
        </div>
      ),
    },
  ];

  return (
    <>
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
        tabExtra={(activeTabKey) => {
          if (activeTabKey === "usage") {
            return (
              <Button
                onClick={() =>
                  confirmAction(
                    "refresh_usage",
                    "刷新用量",
                    `确认刷新 ${formatMonth(billing.period)} 账期的用量与费用？`,
                    "用量与费用已刷新",
                  )
                }
              >
                刷新用量
              </Button>
            );
          }
          if (activeTabKey === "bills") {
            return (
              <Button
                type="primary"
                disabled={billing.usageCostUsd <= 0}
                onClick={() =>
                  confirmAction(
                    "generate_invoice",
                    "生成账单",
                    `确认按本期用量费用 ${formatUsd(billing.usageCostUsd)} 生成账单？`,
                    "账单已生成",
                  )
                }
              >
                生成账单
              </Button>
            );
          }
          if (activeTabKey === "credit") {
            return (
              <Button type="primary" onClick={() => setAdjustVisible(true)}>
                授信调账
              </Button>
            );
          }
          return null;
        }}
        defaultTabKey="usage"
        onBack={returnToList}
      />

      <CreditAdjustmentModal
        visible={adjustVisible}
        amount={adjustmentAmount}
        reason={adjustmentReason}
        onAmountChange={setAdjustmentAmount}
        onReasonChange={setAdjustmentReason}
        onConfirm={submitAdjustment}
        onCancel={() => {
          setAdjustVisible(false);
          setAdjustmentAmount(0);
          setAdjustmentReason("");
        }}
      />
    </>
  );
}
