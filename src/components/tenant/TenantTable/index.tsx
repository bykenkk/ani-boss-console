import { Link, Modal, Tag, Typography } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ListDataTable, DataTableNameCell } from "@/components/common";
import { tenantStatusMeta, type Tenant } from "@/components/tenant/model";
import { formatDateTimeMinute } from "@/lib/date";

interface TenantTableProps {
  data: Tenant[];
  onToggleStatus: (tenant: Tenant) => void;
  onDisable: (tenant: Tenant) => void;
  onQuota: (tenant: Tenant) => void;
  onAdmins: (tenant: Tenant) => void;
}

export function TenantTable({
  data,
  onToggleStatus,
  onDisable,
  onQuota,
  onAdmins,
}: TenantTableProps) {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const columns = [
    {
      title: "租户 / 显示名",
      dataIndex: "name",
      width: 220,
      fixed: "left" as const,
      render: (_: unknown, tenant: Tenant) => (
        <DataTableNameCell
          name={
            <Link
              href={`/tenants/${tenant.id}`}
              onClick={(event) => {
                event.preventDefault();
                void navigate({
                  to: "/tenants/$tenantId",
                  params: { tenantId: tenant.id },
                });
              }}
            >
              {tenant.name}
            </Link>
          }
          id={tenant.displayName || "-"}
        />
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 90,
      render: (_: unknown, tenant: Tenant) => {
        const status = tenantStatusMeta[tenant.status];
        return <Tag color={status.color}>{status.label}</Tag>;
      },
    },
    { title: "配额策略", dataIndex: "quotaPackage", width: 110 },
    {
      title: "管理员数",
      dataIndex: "adminCount",
      width: 100,
      align: "right" as const,
    },
    {
      title: "余额（USD）",
      dataIndex: "balanceUsd",
      width: 130,
      align: "right" as const,
      render: (value: number) => (
        <Typography.Text type={value < 0 ? "error" : undefined}>
          {value.toLocaleString("en-US", {
            style: "currency",
            currency: "USD",
          })}
        </Typography.Text>
      ),
    },
    { title: "区域", dataIndex: "regionName", width: 120 },
    {
      title: "开通时间",
      dataIndex: "createdAt",
      width: 170,
      render: (value: string) => formatDateTimeMinute(value),
    },
  ];

  return (
    <ListDataTable
      rowKey="id"
      columns={columns}
      rowActions={[
        {
          key: "toggle-status",
          label: (tenant) => (tenant.status === "suspended" ? "解冻" : "冻结"),
          widthLabel: "解冻",
          visible: (tenant) => tenant.status !== "disabled",
          onClick: (tenant) => {
            Modal.confirm({
              title: `确认${tenant.status === "suspended" ? "解冻" : "冻结"}租户 ${tenant.name}？`,
              onOk: () => onToggleStatus(tenant),
            });
          },
        },
        {
          key: "quota",
          label: "配额",
          onClick: onQuota,
        },
        {
          key: "admins",
          label: "管理员",
          onClick: onAdmins,
        },
        {
          key: "disable",
          label: "禁用",
          intent: "danger",
          visible: (tenant) => tenant.status !== "disabled",
          onClick: (tenant) => {
            Modal.confirm({
              title: `禁用 ${tenant.name} 后不可还原，确认继续？`,
              okButtonProps: { status: "danger" },
              onOk: () => onDisable(tenant),
            });
          },
        },
      ]}
      data={data}
      pagination={{
        page,
        pageSize,
        total: data.length,
        onPageChange: setPage,
        onPageSizeChange: (nextPageSize) => {
          setPage(1);
          setPageSize(nextPageSize);
        },
      }}
      emptyText="暂无符合条件的租户"
    />
  );
}
