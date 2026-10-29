import { tenantBillingDemoData } from "../demo";
import { Button, Typography } from "@arco-design/web-react";
import { IconDownload } from "@arco-design/web-react/icon";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  ListDataTable,
  ResourceNameId,
  ListPageFrame,
  type ListColumn,
  StatusBadge,
} from "@/components/common";
import { formatUsd } from "@/components/tenant/TenantBillingSummary/formatters";
import { tenantBillingStatusMeta, type TenantBilling, type TenantBillingStatus } from "../model";
import { formatDate, formatDateTimeMinute, formatMonth } from "@/lib/date";

export function TenantBillingList() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const columns: ListColumn<TenantBilling>[] = [
    {
      title: "租户",
      dataIndex: "tenantName",
      width: 200,
      fixed: "left",
      render: (_, item) => (
        <Link to="/tenants-billing/$tenantId" params={{ tenantId: item.tenantId }}>
          <ResourceNameId name={item.tenantName} id={item.tenantId} />
        </Link>
      ),
    },
    {
      title: "账期状态",
      dataIndex: "status",
      width: 120,
      render: (status: TenantBillingStatus) => (
        <StatusBadge
          tone={tenantBillingStatusMeta[status].tone}
          value={tenantBillingStatusMeta[status].label}
        />
      ),
    },
    {
      title: "账期",
      dataIndex: "period",
      width: 180,
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
      width: 180,
      render: (value: string) => formatDate(value),
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 180,
      render: (value: string) => formatDateTimeMinute(value),
    },
  ];

  return (
    <ListPageFrame
      header={{
        title: "租户计费与用量",
        subtitle: "账务功能未接入，当前为演示数据，相关操作暂不可用。",
        extra: (
          <Button disabled title="账务功能未接入" icon={<IconDownload />}>
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
            disabled: () => true,
            tooltip: "账务功能未接入",
            onClick: () => {},
          },
          {
            key: "adjust-credit",
            label: "授信调账",
            disabled: () => true,
            tooltip: "账务功能未接入",
            onClick: () => {},
          },
          {
            key: "generate-invoice",
            label: "生成账单",
            disabled: () => true,
            tooltip: "账务功能未接入",
            onClick: () => {},
          },
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
        data={tenantBillingDemoData}
        pagination={{
          page,
          pageSize,
          total: tenantBillingDemoData.length,
          onPageChange: setPage,
          onPageSizeChange: (nextPageSize) => {
            setPage(1);
            setPageSize(nextPageSize);
          },
        }}
        emptyText="还没有计费记录"
      />
    </ListPageFrame>
  );
}
