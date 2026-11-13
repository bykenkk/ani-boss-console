import { Button, Input, Select, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listManagement, managementKeys, type ManagedTenant } from "@/api/management";
import {
  ResourceIdentity,
  ListDataTable,
  ListPageFrame,
  StatusBadge,
  type ListColumn,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { TenantEditModal } from "@/components/tenant/TenantEditModal";
import { useTenantActions } from "@/hooks/useTenantActions";

interface TenantsPageProps {
  onOpenTenant: (tenantId: number) => void;
}

export function TenantsPage({ onOpenTenant }: TenantsPageProps) {
  const columns: ListColumn<ManagedTenant>[] = [
    {
      key: "name",
      dataIndex: "name",
      title: "租户 / ID",
      width: 200,
      ellipsis: true,
      render: (_, row) => (
        <ResourceIdentity
          name={row.name ?? String(row.id)}
          id={row.id}
          idLabel="租户 ID"
          onOpen={() => onOpenTenant(row.id)}
        />
      ),
    },
    {
      key: "code",
      dataIndex: "code",
      title: "租户编码",
      width: 160,
      ellipsis: true,
      render: (value) => String(value ?? "-"),
    },
    {
      key: "status",
      dataIndex: "status",
      title: "状态",
      width: 120,
      ellipsis: true,
      render: (value: string | undefined) => (
        <StatusBadge
          value={
            (
              { ON: "启用", OFF: "禁用", FREEZE: "冻结", EXPIRED: "过期" } as Record<string, string>
            )[value ?? ""] ??
            value ??
            "-"
          }
          tone={
            value === "ON" || value === "NORMAL"
              ? "success"
              : value === "OFF" || value === "DISABLED"
                ? "default"
                : "warning"
          }
        />
      ),
    },
    {
      key: "type",
      dataIndex: "type",
      title: "租户类型",
      width: 160,
      ellipsis: true,
      render: (value: string | undefined) =>
        (
          ({
            TENANT_TYPE_UNSPECIFIED: "未指定",
            TRIAL: "试用",
            PAID: "付费",
            INTERNAL: "内部",
            PARTNER: "合作伙伴",
            CUSTOM: "定制",
          }) as Record<string, string>
        )[value ?? ""] ??
        value ??
        "-",
    },
    {
      key: "adminUserName",
      dataIndex: "adminUserName",
      title: "管理员用户名",
      width: 200,
      ellipsis: true,
      render: (_, row) => <ResourceIdentity name={row.adminUserName} display="name" />,
    },
    {
      key: "memberCount",
      dataIndex: "memberCount",
      title: "成员数",
      width: 160,
      ellipsis: true,
      render: (value) => String(value ?? "-"),
    },
    {
      key: "createdAt",
      title: "创建时间",
      width: 180,
      render: (_, row) => formatDateTime(row.createdAt),
    },
  ];

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();

  const [editing, setEditing] = useState<ManagedTenant | "create">();
  const input = {
    page,
    pageSize,
    filters: {
      ...(search ? { name__contains: search } : {}),
      ...(status ? { status } : {}),
    },
  };
  const query = useQuery({
    queryKey: managementKeys.list("tenants", input),
    queryFn: ({ signal }) => listManagement("tenants", input, signal),
    meta: {
      errorNotification: { id: withId("management-list", "tenants"), action: "租户列表加载" },
    },
  });
  const { actions: rowActions } = useTenantActions({
    onEdit: setEditing,
    onDeleted: () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
    },
  });
  return (
    <>
      <ListPageFrame
        header={{
          title: "租户列表",
          subtitle: "管理租户资料、状态、有效期和订阅套餐，查看用量与配额。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              新建租户
            </Button>
          ),
          filters: (
            <Space>
              <Input.Search
                aria-label="搜索"
                placeholder="搜索名称"
                onSearch={(value) => {
                  setSearch(value.trim());
                  setPage(1);
                }}
                allowClear
                onClear={() => {
                  setSearch("");
                  setPage(1);
                }}
              />
              <Select
                aria-label="状态筛选"
                placeholder="全部状态"
                allowClear
                options={Object.entries({
                  ON: "启用",
                  OFF: "禁用",
                  FREEZE: "冻结",
                  EXPIRED: "过期",
                }).map(([value, label]) => ({ value, label }))}
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />
            </Space>
          ),
          refresh: { onClick: () => void query.refetch(), spinning: query.isFetching },
        }}
      >
        <ListDataTable
          data={query.data?.items ?? []}
          columns={columns}
          rowActions={rowActions}
          loading={query.isPending}
          pagination={{
            page,
            pageSize,
            total: query.data ? Number(query.data.total) : 0,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </ListPageFrame>
      {editing && (
        <TenantEditModal
          record={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
