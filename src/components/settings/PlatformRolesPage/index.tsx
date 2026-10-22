import { Button, Input, Modal, Select, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagement,
  listManagement,
  managementKeys,
  type ManagedRole,
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
import { RoleEditModal } from "@/components/management/RoleEditModal";

const columns: ListColumn<ManagedRole>[] = [
  {
    key: "name",
    dataIndex: "name",
    title: "角色名称",
    width: 200,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "code",
    dataIndex: "code",
    title: "角色编码",
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
        value={({ ON: "启用", OFF: "禁用" } as Record<string, string>)[value ?? ""] ?? value ?? "-"}
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
    key: "tenantName",
    dataIndex: "tenantName",
    title: "所属租户",
    width: 160,
    ellipsis: true,
    render: (value, row) => (row.tenantId === 0 ? "-" : String(value ?? "-")),
  },
  {
    key: "createdAt",
    title: "创建时间",
    width: 180,
    render: (_, row) => formatDateTime(row.createdAt),
  },
];

export function PlatformRolesPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();

  const [editing, setEditing] = useState<ManagedRole | "create">();
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
    queryKey: managementKeys.list("roles", input),
    queryFn: ({ signal }) => listManagement("roles", input, signal),
    meta: { errorNotification: { id: withId("management-list", "roles"), action: "角色管理加载" } },
  });
  const refresh = () => client.invalidateQueries({ queryKey: managementKeys.all });
  const removal = useMutation({
    mutationFn: (id: number) => deleteManagement("roles", id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "roles"),
        action: "删除角色",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    },
  });

  const rowActions: RowAction<ManagedRole>[] = [
    { key: "edit", label: "编辑", onClick: setEditing },

    {
      key: "delete",
      label: "删除",
      intent: "danger",
      disabled: (row) => !!row.isProtected,
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        Modal.confirm({
          title: "删除角色",
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
          title: "角色管理",
          subtitle: "统一管理系统角色、角色模板和租户角色，维护角色归属与权限配置。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              新建角色
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
                options={Object.entries({ ON: "启用", OFF: "禁用" }).map(([value, label]) => ({
                  value,
                  label,
                }))}
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
        <RoleEditModal
          record={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
