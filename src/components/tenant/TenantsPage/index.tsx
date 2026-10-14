import { Button, Input, Modal, Select, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagement,
  listManagement,
  managementKeys,
  type ManagedTenant,
} from "@/api/management";
import {
  ListDataTable,
  ListPageFrame,
  StatusBadge,
  type ListColumn,
  type RowAction,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { TenantEditModal } from "@/components/tenant/TenantEditModal";

import { Link } from "@tanstack/react-router";
import { TenantDetailsModal } from "@/components/tenant/TenantDetailsModal";

const columns: ListColumn<ManagedTenant>[] = [
  {
    key: "name",
    dataIndex: "name",
    title: "名称",
    width: 200,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "code",
    dataIndex: "code",
    title: "编码",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "type",
    dataIndex: "type",
    title: "类型",
    width: 160,
    ellipsis: true,
    render: (value: string | undefined) =>
      (
        ({
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
    title: "管理员",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "status",
    dataIndex: "status",
    title: "状态",
    width: 160,
    ellipsis: true,
    render: (value: string | undefined) => (
      <StatusBadge
        value={
          ({ ON: "启用", OFF: "禁用", FREEZE: "冻结", EXPIRED: "过期" } as Record<string, string>)[
            value ?? ""
          ] ??
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
    key: "planId",
    dataIndex: "planId",
    title: "套餐",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
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

export function TenantsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();

  const [tenant, setTenant] = useState<ManagedTenant>();

  const [editing, setEditing] = useState<ManagedTenant | "create">();
  const client = useQueryClient();
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
  const refresh = () => client.invalidateQueries({ queryKey: managementKeys.all });
  const removal = useMutation({
    mutationFn: (id: number) => deleteManagement("tenants", id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "tenants"),
        action: "删除租户",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    },
  });

  const rowActions: RowAction<ManagedTenant>[] = [
    { key: "detail", label: "详情", onClick: setTenant },

    { key: "edit", label: "编辑", onClick: setEditing },

    {
      key: "delete",
      label: "删除",
      intent: "danger",
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        Modal.confirm({
          title: "删除租户",
          content: `确认删除“${row.name ?? row.id}”？关联配置可能受影响，此操作无法在页面撤销。`,
          onOk: () => removal.mutateAsync(row.id),
        });
      },
    },
  ];
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
            <Space wrap>
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
          tools: (
            <Link to="/tenants-quotas">
              <Button>配额策略</Button>
            </Link>
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
            total: query.data?.total ?? 0,
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

      {tenant && <TenantDetailsModal tenant={tenant} onCancel={() => setTenant(undefined)} />}
    </>
  );
}
