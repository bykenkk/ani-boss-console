import { Button, Modal, Tag, Typography } from "@arco-design/web-react";
import { IconDownload } from "@arco-design/web-react/icon";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { showMessage } from "@/lib/feedback";
import {
  ListDataTable,
  DataTableNameCell,
  ListPageFrame,
  type ListColumn,
} from "@/components/common";
import { CreditAdjustmentModal } from "@/components/tenant/TenantBillingSummary/CreditAdjustmentModal";
import { formatUsd } from "@/components/tenant/TenantBillingSummary/formatters";
import type { TenantBillingAction } from "@/components/tenant/TenantManagementProvider";
import { useTenantManagement } from "@/components/tenant/TenantManagementProvider/useTenantManagement";
import {
  tenantBillingStatusMeta,
  type TenantBilling,
  type TenantBillingStatus,
} from "@/components/tenant/model";
import { formatDate, formatDateTimeMinute, formatMonth } from "@/lib/date";

export function TenantBillingList() {
  const { tenantBillings, applyTenantBillingAction } = useTenantManagement();
  const [adjustingBilling, setAdjustingBilling] = useState<TenantBilling>();
  const [adjustmentAmount, setAdjustmentAmount] = useState(0);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    billing: TenantBilling,
    action: Exclude<TenantBillingAction, "adjust_credit" | "export_statement">,
    title: string,
    content: string,
    success: string,
  ) => {
    Modal.confirm({
      title,
      content,
      onOk: () => void showResult(applyTenantBillingAction(billing.tenantId, action), success),
    });
  };

  const submitAdjustment = () => {
    if (!adjustingBilling) return;
    if (!adjustmentAmount) {
      showMessage({ type: "warning", content: "请输入非零调账金额" });
      return;
    }
    if (
      showResult(
        applyTenantBillingAction(adjustingBilling.tenantId, "adjust_credit", {
          amountUsd: adjustmentAmount,
          reason: adjustmentReason,
        }),
        "授信调账已完成",
      )
    ) {
      setAdjustingBilling(undefined);
      setAdjustmentAmount(0);
      setAdjustmentReason("");
    }
  };

  const handleMoreAction = (action: string, billing: TenantBilling) => {
    if (action === "adjust_credit") {
      setAdjustingBilling(billing);
      setAdjustmentAmount(0);
      setAdjustmentReason("");
      return;
    }
    if (action === "generate_invoice") {
      confirmAction(
        billing,
        "generate_invoice",
        "生成账单",
        `确认按本期用量费用 ${formatUsd(billing.usageCostUsd)} 生成账单？`,
        "账单已生成",
      );
      return;
    }
    if (action === "mark_settled") {
      confirmAction(
        billing,
        "mark_settled",
        "标记结清",
        "确认该租户已完成线下结算并标记结清？",
        "账单已结清",
      );
      return;
    }
    if (action === "export_statement") {
      showResult(applyTenantBillingAction(billing.tenantId, "export_statement"), "对账单已导出");
    }
  };

  const columns: ListColumn<TenantBilling>[] = [
    {
      title: "租户",
      dataIndex: "tenantName",
      width: 190,
      fixed: "left",
      render: (_, item) => (
        <DataTableNameCell
          name={
            <Link to="/tenants-billing/$tenantId" params={{ tenantId: item.tenantId }}>
              {item.tenantName}
            </Link>
          }
          id={item.tenantId}
        />
      ),
    },
    {
      title: "账期状态",
      dataIndex: "status",
      width: 110,
      render: (status: TenantBillingStatus) => (
        <Tag color={tenantBillingStatusMeta[status].color}>
          {tenantBillingStatusMeta[status].label}
        </Tag>
      ),
    },
    {
      title: "账期",
      dataIndex: "period",
      width: 100,
      render: (value: string) => formatMonth(value),
    },
    {
      title: "本期用量费用",
      dataIndex: "usageCostUsd",
      width: 145,
      align: "right",
      render: (value: number) => formatUsd(value),
    },
    {
      title: "账户余额",
      dataIndex: "balanceUsd",
      width: 130,
      align: "right",
      render: (value: number) => (
        <Typography.Text type={value < 0 ? "error" : undefined}>{formatUsd(value)}</Typography.Text>
      ),
    },
    {
      title: "授信额度",
      dataIndex: "creditUsd",
      width: 130,
      align: "right",
      render: (value: number) => formatUsd(value),
    },
    {
      title: "账单号",
      dataIndex: "invoiceNo",
      width: 145,
      render: (value?: string) => value ?? "-",
    },
    {
      title: "到期日",
      dataIndex: "dueDate",
      width: 120,
      render: (value: string) => formatDate(value),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 160,
      render: (value: string) => formatDateTimeMinute(value),
    },
  ];

  return (
    <>
      <ListPageFrame
        header={{
          title: "租户计费与用量",
          subtitle: "面向企业云租户的计量结算视图；平台级资源计量请前往平台计量与结算。",
          extra: (
            <Button
              icon={<IconDownload />}
              onClick={() =>
                showMessage({
                  type: "success",
                  content: `已导出 ${tenantBillings.length} 条计费记录`,
                })
              }
            >
              导出计费记录
            </Button>
          ),
        }}
      >
        <ListDataTable
          rowKey="id"
          columns={columns}
          rowActions={[
            {
              key: "refresh-usage",
              label: "刷新用量",
              onClick: (item) =>
                confirmAction(
                  item,
                  "refresh_usage",
                  "刷新用量",
                  `确认刷新 ${item.tenantName} ${item.period} 账期的用量与费用？`,
                  "用量与费用已刷新",
                ),
            },
            {
              key: "adjust-credit",
              label: "授信调账",
              onClick: (item) => handleMoreAction("adjust_credit", item),
            },
            {
              key: "generate-invoice",
              label: "生成账单",
              disabled: (item) => item.usageCostUsd <= 0,
              onClick: (item) => handleMoreAction("generate_invoice", item),
            },
            {
              key: "mark-settled",
              label: "标记结清",
              disabled: (item) => item.status !== "overdue" && item.balanceUsd >= 0,
              onClick: (item) => handleMoreAction("mark_settled", item),
            },
            {
              key: "export-statement",
              label: "导出对账单",
              onClick: (item) => handleMoreAction("export_statement", item),
            },
          ]}
          data={tenantBillings}
          pagination={{
            page,
            pageSize,
            total: tenantBillings.length,
            onPageChange: setPage,
            onPageSizeChange: (nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            },
          }}
          emptyText="还没有计费记录"
        />
      </ListPageFrame>

      <CreditAdjustmentModal
        visible={Boolean(adjustingBilling)}
        amount={adjustmentAmount}
        reason={adjustmentReason}
        onAmountChange={setAdjustmentAmount}
        onReasonChange={setAdjustmentReason}
        onConfirm={submitAdjustment}
        onCancel={() => {
          setAdjustingBilling(undefined);
          setAdjustmentAmount(0);
          setAdjustmentReason("");
        }}
      />
    </>
  );
}
