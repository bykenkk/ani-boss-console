import { Button, Input, Modal, Select, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagement,
  listManagement,
  managementKeys,
  syncManagementApis,
  type ManagedApi,
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
import { ApiEditModal } from "@/components/management/ApiEditModal";

const columns: ListColumn<ManagedApi>[] = [
  {
    key: "path",
    dataIndex: "path",
    title: "接口路径",
    width: 300,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "method",
    dataIndex: "method",
    title: "请求方法",
    width: 160,
    ellipsis: true,
    render: (value: string | undefined) =>
      (
        ({
          GET: "GET",
          POST: "POST",
          PUT: "PUT",
          PATCH: "PATCH",
          DELETE: "DELETE",
          HEAD: "HEAD",
          OPTIONS: "OPTIONS",
        }) as Record<string, string>
      )[value ?? ""] ??
      value ??
      "-",
  },
  {
    key: "module",
    dataIndex: "module",
    title: "模块",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "operation",
    dataIndex: "operation",
    title: "操作标识",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "scope",
    dataIndex: "scope",
    title: "作用域",
    width: 160,
    ellipsis: true,
    render: (value: string | undefined) =>
      (({ ADMIN: "管理后台", APP: "应用" }) as Record<string, string>)[value ?? ""] ?? value ?? "-",
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

export function ApisPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();

  const [editing, setEditing] = useState<ManagedApi | "create">();
  const client = useQueryClient();
  const input = {
    page,
    pageSize,
    filters: {
      ...(search ? { path__contains: search } : {}),
      ...(status ? { status } : {}),
    },
  };
  const query = useQuery({
    queryKey: managementKeys.list("apis", input),
    queryFn: ({ signal }) => listManagement("apis", input, signal),
    meta: { errorNotification: { id: withId("management-list", "apis"), action: "API 管理加载" } },
  });
  const refresh = () => client.invalidateQueries({ queryKey: managementKeys.all });
  const removal = useMutation({
    mutationFn: (id: number) => deleteManagement("apis", id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "apis"),
        action: "删除API",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    },
  });
  const sync = useMutation({
    mutationFn: syncManagementApis,
    meta: {
      feedback: { channel: "notification", id: "management-api-sync", action: "同步 API 资源" },
    },
    onSuccess: refresh,
  });
  const rowActions: RowAction<ManagedApi>[] = [
    { key: "edit", label: "编辑", onClick: setEditing },

    {
      key: "delete",
      label: "删除",
      intent: "danger",
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        Modal.confirm({
          title: "删除API",
          content: `确认删除“${row.path ?? row.id}”？关联配置可能受影响，此操作无法在页面撤销。`,
          onOk: () => removal.mutateAsync(row.id),
        });
      },
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{
          title: "API 管理",
          subtitle: "维护接口路径、请求方法和业务归属，同步接口目录以供权限点关联。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              新建API
            </Button>
          ),
          filters: (
            <Space>
              <Input.Search
                aria-label="搜索"
                placeholder="搜索接口路径"
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

          tools: (
            <Button
              loading={sync.isPending}
              onClick={() =>
                Modal.confirm({
                  title: "同步 API 资源",
                  content: "从后端已注册路由同步 API 清单。确认更新资源信息？",
                  onOk: () => sync.mutateAsync(),
                })
              }
            >
              同步 API
            </Button>
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
        <ApiEditModal
          record={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
