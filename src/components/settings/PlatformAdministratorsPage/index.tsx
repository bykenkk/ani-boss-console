import { Button, Input, Modal, Select } from "@arco-design/web-react";
import { IconPlus, IconRefresh } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import {
  createPlatformAdministrator,
  deletePlatformAdministrator,
  disablePlatformAdministrator,
  enablePlatformAdministrator,
  fetchPlatformAdministratorRoles,
  fetchPlatformAdministrators,
  getPlatformAdministratorErrorMessage,
  platformAdministratorQueryKeys,
  resetPlatformAdministratorPassword,
  updatePlatformAdministratorRole,
  type CreatePlatformAdministratorInput,
  type PlatformAdministratorListFilters,
  type PlatformAdministratorListItem,
  type PlatformAdministratorStatus,
} from "@/api/platform-admins";
import {
  DataTableNameCell,
  ListDataTable,
  ListPageFrame,
  ListPageHeader,
  ListToolbar,
  type ListColumn,
} from "@/components/common";
import { getAccessTokenRoles, useAuthState } from "@/components/auth/store";
import { Metric } from "@/components/overview/Metric";
import { formatDateTime } from "@/lib/date";
import { PlatformAdministratorStatusBadge } from "../PlatformAdministratorStatusBadge";
import { platformAdministratorRoleLabels, platformAdministratorSourceLabels } from "../model";
import {
  PlatformAdministratorCreateModal,
  PlatformAdministratorPasswordModal,
  PlatformAdministratorRoleModal,
} from "./PlatformAdministratorModals";

interface StatusOperationInput {
  userId: string;
  status: PlatformAdministratorStatus;
}

async function runAdministratorOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getPlatformAdministratorErrorMessage(error));
  }
}

export function PlatformAdministratorsPage() {
  const queryClient = useQueryClient();
  const authState = useAuthState();
  const [keyword, setKeyword] = useState("");
  const [roleId, setRoleId] = useState("all");
  const [status, setStatus] = useState<"all" | PlatformAdministratorStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createVisible, setCreateVisible] = useState(false);
  const [roleTarget, setRoleTarget] = useState<PlatformAdministratorListItem | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<PlatformAdministratorListItem | null>(null);
  const deferredKeyword = useDeferredValue(keyword.trim());
  const canManage =
    authState.developmentBypass ||
    getAccessTokenRoles(authState.tokens?.access_token).includes("platform-admin");

  const filters = useMemo<PlatformAdministratorListFilters>(() => {
    const result: PlatformAdministratorListFilters = {};
    if (roleId !== "all") result.roleId = roleId;
    if (status !== "all") result.status = status;
    if (deferredKeyword) result.search = deferredKeyword;
    return result;
  }, [deferredKeyword, roleId, status]);

  const overviewQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-administrators",
        action: "平台运营账号汇总加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.list(),
    queryFn: () => fetchPlatformAdministrators(),
  });
  const listQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-administrators",
        action: "平台运营账号列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.list(filters),
    queryFn: () => fetchPlatformAdministrators(filters),
  });
  const rolesQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-administrator-roles",
        action: "平台角色加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.roles,
    queryFn: fetchPlatformAdministratorRoles,
  });

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: platformAdministratorQueryKeys.all });
  const createMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "平台运营账号创建",
        successText: "平台运营账号已创建",
        errorFallback: "平台运营账号创建失败，请稍后重试",
      },
    },
    mutationFn: (input: CreatePlatformAdministratorInput) =>
      runAdministratorOperation(() => createPlatformAdministrator(input)),
    onSuccess: async () => {
      await invalidateAll();
      setCreateVisible(false);
    },
  });
  const roleMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "账号角色更新",
        successText: "账号角色已更新",
        errorFallback: "账号角色更新失败，请稍后重试",
      },
    },
    mutationFn: (input: Parameters<typeof updatePlatformAdministratorRole>[0]) =>
      runAdministratorOperation(() => updatePlatformAdministratorRole(input)),
    onSuccess: async () => {
      await invalidateAll();
      setRoleTarget(null);
    },
  });
  const passwordMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "账号密码重置",
        successText: "账号密码已重置",
        errorFallback: "账号密码重置失败，请稍后重试",
      },
    },
    mutationFn: (input: Parameters<typeof resetPlatformAdministratorPassword>[0]) =>
      runAdministratorOperation(() => resetPlatformAdministratorPassword(input)),
    onSuccess: async () => {
      await invalidateAll();
      setPasswordTarget(null);
    },
  });
  const statusMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "platform-administrator-status",
        action: "账号状态更新",
        errorFallback: "账号状态更新失败，请稍后重试",
      },
    },
    mutationFn: ({ userId, status: currentStatus }: StatusOperationInput) =>
      runAdministratorOperation(() =>
        currentStatus === "active"
          ? disablePlatformAdministrator(userId)
          : enablePlatformAdministrator(userId),
      ),
    onSuccess: async () => {
      await invalidateAll();
    },
  });
  const deleteMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "platform-administrator-delete",
        action: "平台运营账号删除",
        successText: "账号已删除",
        errorFallback: "账号删除失败，请稍后重试",
      },
    },
    mutationFn: (userId: string) =>
      runAdministratorOperation(() => deletePlatformAdministrator(userId)),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const operationPending =
    roleMutation.isPending ||
    passwordMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;

  const confirmStatusChange = (administrator: PlatformAdministratorListItem) => {
    const action = administrator.status === "active" ? "禁用" : "启用";
    Modal.confirm({
      title: `${action}账号 ${administrator.displayName}？`,
      content:
        administrator.status === "active"
          ? "禁用后该账号将无法登录管理端。"
          : "启用后该账号可恢复登录管理端。",
      okButtonProps: administrator.status === "active" ? { status: "danger" } : undefined,
      onOk: () =>
        statusMutation.mutateAsync({ userId: administrator.id, status: administrator.status }),
    });
  };

  const confirmDelete = (administrator: PlatformAdministratorListItem) => {
    Modal.confirm({
      title: `删除账号 ${administrator.displayName}？`,
      content: "该操作会软删除账号；至少需要保留一名活跃的平台超级管理员。",
      okButtonProps: { status: "danger" },
      onOk: () => deleteMutation.mutateAsync(administrator.id),
    });
  };

  const columns: ListColumn<PlatformAdministratorListItem>[] = [
    {
      key: "name",
      title: "账号",
      width: 240,
      render: (_, administrator) => (
        <DataTableNameCell
          name={
            <Link to="/settings-platform-admins/$userId" params={{ userId: administrator.id }}>
              {administrator.displayName}
            </Link>
          }
          id={administrator.username}
        />
      ),
    },
    { title: "邮箱", width: 190, render: () => "-" },
    {
      title: "角色",
      width: 170,
      render: (_, administrator) => platformAdministratorRoleLabels[administrator.role],
    },
    {
      title: "状态",
      width: 100,
      render: (_, administrator) => (
        <PlatformAdministratorStatusBadge status={administrator.status} />
      ),
    },
    {
      title: "来源",
      width: 120,
      render: (_, administrator) => platformAdministratorSourceLabels[administrator.source],
    },
    { title: "MFA", width: 90, render: () => "-" },
    {
      title: "最近登录",
      width: 180,
      render: (_, administrator) => formatDateTime(administrator.lastLoginAt),
    },
  ];

  const overview = overviewQuery.data || [];
  const overviewUnavailable = overviewQuery.isPending || !overviewQuery.data;
  const activeCount = overview.filter((item) => item.status === "active").length;
  const superCount = overview.filter(
    (item) => item.status === "active" && item.role === "platform-admin",
  ).length;
  const metricValue = (value: number) => (overviewUnavailable ? "-" : String(value));
  const refreshing = overviewQuery.isFetching || listQuery.isFetching || rolesQuery.isFetching;

  return (
    <>
      <ListPageFrame
        header={
          <>
            <ListPageHeader
              title="平台管理员"
              subtitle="管理平台本地登录账号；这些账号不属于租户，也不会同步为租户成员。"
              extra={
                <div className="flex gap-2">
                  <Button
                    icon={<IconRefresh />}
                    loading={refreshing}
                    onClick={() =>
                      void Promise.all([
                        overviewQuery.refetch(),
                        listQuery.refetch(),
                        rolesQuery.refetch(),
                      ])
                    }
                  >
                    刷新
                  </Button>
                  <Button
                    type="primary"
                    icon={<IconPlus />}
                    disabled={!canManage}
                    title={canManage ? undefined : "仅平台超级管理员可创建账号"}
                    onClick={() => setCreateVisible(true)}
                  >
                    新建账号
                  </Button>
                </div>
              }
            />

            <section className="grid flex-none grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2">
              <Metric label="全部账号" value={metricValue(overview.length)} hint="平台登录身份" />
              <Metric label="活跃" value={metricValue(activeCount)} hint="可登录管理端" />
              <Metric label="活跃超级管理员" value={metricValue(superCount)} hint="至少保留 1 名" />
              <Metric label="已启用 MFA" value="-" hint="接口未返回 MFA 状态" />
            </section>
          </>
        }
        toolbar={
          <ListToolbar
            filters={
              <div className="flex flex-wrap items-center gap-3">
                <Input.Search
                  value={keyword}
                  onChange={(value) => {
                    setKeyword(value);
                    setPage(1);
                  }}
                  allowClear
                  placeholder="搜索用户名或邮箱"
                  style={{ width: 320 }}
                />
                <Select
                  value={roleId}
                  onChange={(value) => {
                    setRoleId(value);
                    setPage(1);
                  }}
                  style={{ width: 180 }}
                >
                  <Select.Option value="all">全部角色</Select.Option>
                  {(rolesQuery.data || []).map((roleOption) => (
                    <Select.Option key={roleOption.id} value={roleOption.id}>
                      {platformAdministratorRoleLabels[roleOption.name]}
                    </Select.Option>
                  ))}
                </Select>
                <Select
                  value={status}
                  onChange={(value) => {
                    setStatus(value as "all" | PlatformAdministratorStatus);
                    setPage(1);
                  }}
                  style={{ width: 140 }}
                >
                  <Select.Option value="all">全部状态</Select.Option>
                  <Select.Option value="active">活跃</Select.Option>
                  <Select.Option value="disabled">已禁用</Select.Option>
                </Select>
              </div>
            }
            tools={
              <span className="text-xs text-gray-500">共 {listQuery.data?.length ?? 0} 个账号</span>
            }
          />
        }
      >
        <ListDataTable
          rowKey="id"
          columns={columns}
          rowActions={[
            {
              key: "change-role",
              label: "修改角色",
              disabled: () => !canManage || operationPending,
              onClick: setRoleTarget,
            },
            {
              key: "reset-password",
              label: "重置密码",
              disabled: (administrator) =>
                !canManage || operationPending || administrator.source !== "local",
              onClick: setPasswordTarget,
            },
            {
              key: "status",
              label: (administrator) =>
                administrator.status === "active" ? "禁用账号" : "启用账号",
              widthLabel: "禁用账号",
              disabled: () => !canManage || operationPending,
              onClick: confirmStatusChange,
            },
            {
              key: "delete",
              label: "删除账号",
              intent: "danger",
              disabled: () => !canManage || operationPending,
              onClick: confirmDelete,
            },
          ]}
          data={listQuery.data || []}
          loading={listQuery.isPending}
          pagination={{
            page,
            pageSize,
            total: listQuery.data?.length ?? 0,
            onPageChange: setPage,
            onPageSizeChange: (nextPageSize) => {
              setPage(1);
              setPageSize(nextPageSize);
            },
          }}
          scroll={{ x: 1300, y: true }}
          emptyText="暂无符合条件的平台运营账号"
        />
      </ListPageFrame>

      <PlatformAdministratorCreateModal
        visible={createVisible}
        loading={createMutation.isPending}
        roles={rolesQuery.data || []}
        onCancel={() => setCreateVisible(false)}
        onSubmit={(input: CreatePlatformAdministratorInput) => createMutation.mutate(input)}
      />
      <PlatformAdministratorRoleModal
        target={roleTarget}
        loading={roleMutation.isPending}
        roles={rolesQuery.data || []}
        onCancel={() => setRoleTarget(null)}
        onSubmit={(roleId) => {
          if (roleTarget) roleMutation.mutate({ userId: roleTarget.id, roleId });
        }}
      />
      <PlatformAdministratorPasswordModal
        target={passwordTarget}
        loading={passwordMutation.isPending}
        onCancel={() => setPasswordTarget(null)}
        onSubmit={(newPassword) => {
          if (passwordTarget) {
            passwordMutation.mutate({ userId: passwordTarget.id, newPassword });
          }
        }}
      />
    </>
  );
}
