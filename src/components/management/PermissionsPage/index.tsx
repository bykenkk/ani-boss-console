import { Button, Input, Modal, Select, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagement,
  listManagement,
  managementKeys,
  type ManagedPermission,
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
import { PermissionEditModal } from "@/components/management/PermissionEditModal";

const columns: ListColumn<ManagedPermission>[] = [
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
    key: "groupName",
    dataIndex: "groupName",
    title: "权限分组",
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
    key: "createdAt",
    title: "创建时间",
    width: 180,
    render: (_, row) => formatDateTime(row.createdAt),
  },
];

export function PermissionsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();

  const [editing, setEditing] = useState<ManagedPermission | "create">();
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
    queryKey: managementKeys.list("permissions", input),
    queryFn: ({ signal }) => listManagement("permissions", input, signal),
    meta: {
      errorNotification: { id: withId("management-list", "permissions"), action: "权限点管理加载" },
    },
  });
  const refresh = () => client.invalidateQueries({ queryKey: managementKeys.all });
  const removal = useMutation({
    mutationFn: (id: number) => deleteManagement("permissions", id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "permissions"),
        action: "删除权限点",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    },
  });

  const rowActions: RowAction<ManagedPermission>[] = [
    { key: "edit", label: "编辑", onClick: setEditing },

    {
      key: "delete",
      label: "删除",
      intent: "danger",
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        Modal.confirm({
          title: "删除权限点",
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
          title: "权限点管理",
          subtitle: "维护权限点及关联 API，为角色配置可访问的接口权限。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              新建权限点
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
        <PermissionEditModal
          record={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
