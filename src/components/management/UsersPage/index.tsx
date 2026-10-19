import { Button, Input, Modal, Select, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagement,
  listManagement,
  managementKeys,
  type ManagedUser,
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
import { UserEditModal } from "@/components/management/UserEditModal";
import { TenantSelect } from "@/components/tenant/TenantSelect";
import { RoleSelect } from "@/components/management/RoleSelect";
import { UserPasswordResetModal } from "@/components/management/UserPasswordResetModal";

const columns: ListColumn<ManagedUser>[] = [
  {
    key: "username",
    dataIndex: "username",
    title: "用户名",
    width: 200,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "realname",
    dataIndex: "realname",
    title: "姓名",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "tenantName",
    dataIndex: "tenantName",
    title: "所属租户",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "roleNames",
    dataIndex: "roleNames",
    title: "角色",
    width: 160,
    ellipsis: true,
    render: (value: string[] | undefined) => value?.join("、") || "-",
  },
  {
    key: "email",
    dataIndex: "email",
    title: "邮箱",
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
          (
            {
              NORMAL: "正常",
              DISABLED: "禁用",
              PENDING: "待激活",
              LOCKED: "锁定",
              EXPIRED: "过期",
              CLOSED: "注销",
            } as Record<string, string>
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
    key: "createdAt",
    title: "创建时间",
    width: 180,
    render: (_, row) => formatDateTime(row.createdAt),
  },
];

export function UsersPage({ scope = "all" }: { scope?: "all" | "platform" | "tenant" }) {
  const title =
    scope === "platform" ? "平台管理员" : scope === "tenant" ? "租户管理员" : "用户管理";

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>();
  const [tenantId, setTenantId] = useState<number>();
  const [roleId, setRoleId] = useState<number>();
  const [passwordUser, setPasswordUser] = useState<ManagedUser>();

  const [editing, setEditing] = useState<ManagedUser | "create">();
  const client = useQueryClient();

  const input = {
    page,
    pageSize,
    filters: {
      // 平台必须显式限定 tenant_id=0；跨租户查询省略 tenant_id，不能使用非 EQ 条件。
      ...(scope === "platform"
        ? { tenant_id: 0 }
        : tenantId !== undefined
          ? { tenant_id: tenantId }
          : {}),
      ...(search ? { username__contains: search } : {}),
      ...(status ? { status } : {}),
      // 角色编码与 ID 同传按并集匹配，管理员范围不能叠加其他角色 ID。
      ...(scope === "platform"
        ? { role_code: "platform:admin" }
        : scope === "tenant"
          ? { role_code: "tenant:manager" }
          : roleId !== undefined
            ? { role_id: roleId }
            : {}),
    },
  };
  const query = useQuery({
    queryKey: managementKeys.list("users", input),
    queryFn: ({ signal }) => listManagement("users", input, signal),
    meta: { errorNotification: { id: withId("management-list", "users"), action: "用户管理加载" } },
  });
  const refresh = () => client.invalidateQueries({ queryKey: managementKeys.all });
  const removal = useMutation({
    mutationFn: (id: number) => deleteManagement("users", id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "users"),
        action: "删除用户",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    },
  });

  const rowActions: RowAction<ManagedUser>[] = [
    { key: "edit", label: "编辑", onClick: setEditing },
    { key: "password", label: "重置密码", onClick: setPasswordUser },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        Modal.confirm({
          title: "删除用户",
          content: `确认删除“${row.username ?? row.id}”？关联配置可能受影响，此操作无法在页面撤销。`,
          onOk: () => removal.mutateAsync(row.id),
        });
      },
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{
          title,
          subtitle:
            scope === "platform"
              ? "维护平台账号资料、状态和角色分配，支持密码重置。"
              : scope === "tenant"
                ? "按租户查看账号，维护用户资料、状态和角色分配，支持密码重置。"
                : "统一管理用户账号，按租户和角色查询，维护账号状态与角色分配。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              新建用户
            </Button>
          ),
          filters: (
            <Space wrap>
              <Input.Search
                aria-label="搜索"
                placeholder="搜索用户名"
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
                  NORMAL: "正常",
                  DISABLED: "禁用",
                  PENDING: "待激活",
                  LOCKED: "锁定",
                  EXPIRED: "过期",
                  CLOSED: "注销",
                }).map(([value, label]) => ({ value, label }))}
                value={status}
                onChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              />
              {scope !== "platform" && (
                <TenantSelect
                  includePlatform={scope !== "tenant"}
                  value={tenantId}
                  onChange={(value) => {
                    setTenantId(value as number | undefined);
                    setRoleId(undefined);
                    setPage(1);
                  }}
                />
              )}
              {scope === "all" && (
                <RoleSelect
                  tenantId={tenantId}
                  value={roleId}
                  onChange={(value) => {
                    setRoleId(value as number | undefined);
                    setPage(1);
                  }}
                />
              )}
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
        <UserEditModal
          userScope={scope}
          record={editing === "create" ? undefined : editing}
          defaults={
            editing === "create"
              ? {
                  ...(scope === "platform" ? { tenantId: 0 } : {}),
                  ...(tenantId !== undefined ? { tenantId } : {}),
                }
              : undefined
          }
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}
      {passwordUser && (
        <UserPasswordResetModal user={passwordUser} onCancel={() => setPasswordUser(undefined)} />
      )}
    </>
  );
}
