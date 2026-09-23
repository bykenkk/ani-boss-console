import { Button, Modal, Select } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import {
  deleteTenantAdministrator,
  fetchTenantAdministratorAvailableTenants,
  fetchTenantAdministrators,
  getTenantManagementErrorMessage,
  inviteTenantAdministrator,
  resendTenantAdministratorInvitation,
  tenantManagementQueryKeys,
  updateTenantAdministratorStatus,
  type InviteTenantAdministratorInput,
  type TenantAdministratorListFilters,
  type TenantAdministratorListItem,
  type TenantAdministratorStatus,
} from "@/api/tenant";
import {
  ResourceNameId,
  ListDataTable,
  ListPageFrame,
  type ListColumn,
  StatusBadge,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import {
  tenantAdministratorRoleLabels,
  tenantAdministratorSourceLabels,
  tenantAdministratorStatusMeta,
} from "../apiModel";
import { TenantAdministratorInviteModal } from "@/components/tenant/TenantAdministratorInviteModal";
import { useTenantManagementAccess } from "@/hooks/useTenantManagementAccess";

async function runAdministratorOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantAdministratorsPages() {
  const queryClient = useQueryClient();
  const { canManage } = useTenantManagementAccess();
  const [keyword, setKeyword] = useState("");
  const [tenantId, setTenantId] = useState("all");
  const [status, setStatus] = useState<"all" | TenantAdministratorStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [inviteVisible, setInviteVisible] = useState(false);
  const deferredKeyword = useDeferredValue(keyword.trim());
  const filters = useMemo<TenantAdministratorListFilters>(() => {
    const next: TenantAdministratorListFilters = {};
    if (tenantId !== "all") next.tenantId = tenantId;
    if (status !== "all") next.status = status;
    if (deferredKeyword) next.search = deferredKeyword;
    return next;
  }, [deferredKeyword, status, tenantId]);

  const listQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-administrators",
        action: "租户管理员加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.administratorList(filters),
    queryFn: () => fetchTenantAdministrators(filters),
  });
  const tenantsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-administrator-tenants",
        action: "可选租户加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.administratorTenants,
    queryFn: fetchTenantAdministratorAvailableTenants,
  });

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const inviteMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "租户管理员邀请",
        successText: "管理员邀请已发送",
        errorFallback: "管理员邀请失败，请稍后重试",
      },
    },
    mutationFn: (input: InviteTenantAdministratorInput) =>
      runAdministratorOperation(() => inviteTenantAdministrator(input)),
    onSuccess: async () => {
      await invalidateAll();
      setInviteVisible(false);
    },
  });
  const resendMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "管理员邀请重发",
        successText: "邀请已重新发送",
        errorFallback: "邀请重发失败，请稍后重试",
      },
    },
    mutationFn: (administrator: TenantAdministratorListItem) =>
      runAdministratorOperation(() =>
        resendTenantAdministratorInvitation(administrator.tenant.id, administrator.id),
      ),
    onSuccess: async () => {
      await invalidateAll();
    },
  });
  const statusMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "tenant-administrator-status",
        action: "管理员状态更新",
        successText: "管理员状态已更新",
        errorFallback: "管理员状态更新失败，请稍后重试",
      },
    },
    mutationFn: (administrator: TenantAdministratorListItem) =>
      runAdministratorOperation(() =>
        updateTenantAdministratorStatus(
          administrator.tenant.id,
          administrator.id,
          administrator.status === "active" ? "disable" : "enable",
        ),
      ),
    onSuccess: async () => {
      await invalidateAll();
    },
  });
  const deleteMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "tenant-administrator-delete",
        action: "租户管理员删除",
        successText: "租户管理员已删除",
        errorFallback: "租户管理员删除失败，请稍后重试",
      },
    },
    mutationFn: (administrator: TenantAdministratorListItem) =>
      runAdministratorOperation(() =>
        deleteTenantAdministrator(administrator.tenant.id, administrator.id),
      ),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const confirmStatus = (administrator: TenantAdministratorListItem) => {
    const label = administrator.status === "active" ? "禁用" : "启用";
    Modal.confirm({
      title: `${label}管理员 ${administrator.displayName || administrator.username}？`,
      content: administrator.status === "active" ? "禁用后该账号将无法登录租户端。" : undefined,
      onOk: () => statusMutation.mutateAsync(administrator),
    });
  };
  const confirmDelete = (administrator: TenantAdministratorListItem) => {
    Modal.confirm({
      title: `删除管理员 ${administrator.displayName || administrator.username}？`,
      content: "删除后该账号将不再具备对应租户的管理员权限。",
      okButtonProps: { status: "danger" },
      onOk: () => deleteMutation.mutateAsync(administrator),
    });
  };

  const columns: ListColumn<TenantAdministratorListItem>[] = [
    {
      key: "name",
      title: "管理员",
      width: 200,
      render: (_, administrator) => (
        <ResourceNameId
          name={
            <Link to="/tenants-admins/$adminId" params={{ adminId: administrator.id }}>
              {administrator.displayName || administrator.username}
            </Link>
          }
          id={administrator.email}
        />
      ),
    },
    {
      title: "状态",
      width: 120,
      render: (_, administrator) => {
        if (administrator.isInviting) {
          return (
            <StatusBadge
              tone={administrator.isExpired ? "danger" : "warning"}
              value={administrator.isExpired ? "邀请过期" : "待接受"}
            />
          );
        }
        const meta = tenantAdministratorStatusMeta[administrator.status];
        return <StatusBadge tone={meta.tone} value={meta.label} />;
      },
    },
    {
      title: "租户",
      width: 150,
      ellipsis: true,
      render: (_, administrator) => administrator.tenant.displayName || administrator.tenant.name,
    },
    {
      title: "角色",
      width: 100,
      ellipsis: true,
      render: (_, administrator) => tenantAdministratorRoleLabels[administrator.role],
    },
    {
      title: "来源",
      width: 80,
      ellipsis: true,
      render: (_, administrator) => tenantAdministratorSourceLabels[administrator.source],
    },
    {
      title: "最近登录",
      dataIndex: "lastLoginAt",
      width: 150,
      render: (value: string | null) => formatDateTime(value),
    },
  ];
  const data = listQuery.data || [];
  const operationPending =
    inviteMutation.isPending ||
    resendMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;

  return (
    <>
      <ListPageFrame
        header={{
          title: "租户管理员",
          subtitle: "集中维护租户管理员邀请、角色、密码和账号状态。",
          extra: (
            <Button
              type="primary"
              icon={<IconPlus />}
              disabled={!canManage || !tenantsQuery.data?.length}
              onClick={() => setInviteVisible(true)}
            >
              邀请管理员
            </Button>
          ),
        }}
        tabs={{
          value: status,
          onChange: (value) => {
            setStatus(value);
            setPage(1);
          },
          items: [
            { value: "all", label: "全部" },
            { value: "active", label: "活跃" },
            { value: "disabled", label: "已禁用" },
          ],
        }}
        toolbar={{
          search: {
            fields: [{ value: "keyword", label: "关键词" }],
            field: "keyword",
            value: keyword,
            placeholder: "搜索邮箱、用户名或显示名",
            onFieldChange: () => undefined,
            onChange: (value) => {
              setKeyword(value);
              setPage(1);
            },
          },
          filters: (
            <Select
              value={tenantId}
              onChange={(value) => {
                setTenantId(value);
                setPage(1);
              }}
            >
              <Select.Option value="all">全部租户</Select.Option>
              {(tenantsQuery.data || []).map((tenant) => (
                <Select.Option key={tenant.id} value={tenant.id}>
                  {tenant.displayName || tenant.name}
                </Select.Option>
              ))}
            </Select>
          ),
          refresh: {
            spinning: listQuery.isFetching || tenantsQuery.isFetching,
            onClick: () => void Promise.all([listQuery.refetch(), tenantsQuery.refetch()]),
          },
          tools: <span className="text-xs text-gray-500">共 {data.length} 个管理员</span>,
        }}
      >
        <ListDataTable
          rowKey={(administrator) => `${administrator.tenant.id}-${administrator.id}`}
          columns={columns}
          data={data}
          loading={listQuery.isPending}
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
          rowActions={[
            {
              key: "resend",
              label: "重发邀请",
              visible: (administrator) => administrator.isInviting,
              disabled: () => !canManage || operationPending,
              onClick: (administrator) => resendMutation.mutate(administrator),
            },
            {
              key: "status",
              label: (administrator) => (administrator.status === "active" ? "禁用" : "启用"),
              widthLabel: "启用",
              visible: (administrator) => !administrator.isInviting,
              disabled: () => !canManage || operationPending,
              onClick: confirmStatus,
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              disabled: () => !canManage || operationPending,
              onClick: confirmDelete,
            },
          ]}
          scroll={{ x: 1250, y: true }}
          emptyText="暂无符合条件的租户管理员"
        />
      </ListPageFrame>

      {inviteVisible ? (
        <TenantAdministratorInviteModal
          tenantOptions={tenantsQuery.data || []}
          loading={inviteMutation.isPending}
          onCancel={() => setInviteVisible(false)}
          onSubmit={(input) => inviteMutation.mutate(input)}
        />
      ) : null}
    </>
  );
}
