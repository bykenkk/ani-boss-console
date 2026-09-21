import {
  Button,
  Descriptions,
  Dropdown,
  Menu,
  Modal,
  Spin,
  Tag,
  Tooltip,
} from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  deleteTenantAdministrator,
  fetchTenantAdministrator,
  fetchTenantAdministrators,
  getTenantManagementErrorMessage,
  resendTenantAdministratorInvitation,
  resetTenantAdministratorPassword,
  tenantManagementQueryKeys,
  updateTenantAdministratorStatus,
} from "@/api/tenant";
import { DetailPageFrame, type DetailInfoCard, type DetailTab } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import {
  tenantAdministratorRoleLabels,
  tenantAdministratorSourceLabels,
  tenantAdministratorStatusMeta,
} from "../apiModel";
import { TenantAdministratorPasswordModal } from "../TenantManagementModals";
import { useTenantManagementAccess } from "../useTenantManagementAccess";
import { TenantAdministratorAudit } from "./TenantAdministratorAudit";
import { TenantAdministratorRole } from "./TenantAdministratorRole";

interface TenantAdministratorDetailPageProps {
  administratorId: string;
}

async function runAdministratorOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantAdministratorDetailPage({
  administratorId,
}: TenantAdministratorDetailPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canManage } = useTenantManagementAccess();
  const [passwordVisible, setPasswordVisible] = useState(false);

  const locatorQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-administrator-locator", administratorId),
        action: "管理员归属加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.administratorList({}),
    queryFn: () => fetchTenantAdministrators(),
  });
  const locatedAdministrator = locatorQuery.data?.find((item) => item.id === administratorId);
  const tenantId = locatedAdministrator?.tenant.id;
  const detailQuery = useQuery({
    enabled: Boolean(tenantId),
    meta: {
      errorNotification: {
        id: withId("tenant-administrator-detail", administratorId),
        action: "租户管理员详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.administratorDetail(tenantId || "", administratorId),
    queryFn: () => fetchTenantAdministrator(tenantId!, administratorId),
  });
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const resendMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "管理员邀请重发",
        successText: "邀请已重新发送",
        errorFallback: "邀请重发失败，请稍后重试",
      },
    },
    mutationFn: () =>
      runAdministratorOperation(() =>
        resendTenantAdministratorInvitation(tenantId!, administratorId),
      ),
    onSuccess: async () => {
      await invalidateAll();
    },
  });
  const passwordMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "管理员密码重置",
        successText: "管理员密码已重置",
        errorFallback: "管理员密码重置失败，请稍后重试",
      },
    },
    mutationFn: (newPassword: string) =>
      runAdministratorOperation(() =>
        resetTenantAdministratorPassword({
          tenantId: tenantId!,
          userId: administratorId,
          newPassword,
        }),
      ),
    onSuccess: async () => {
      await invalidateAll();
      setPasswordVisible(false);
    },
  });
  const statusMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: withId("tenant-administrator-status", administratorId),
        action: "管理员状态更新",
        successText: "管理员状态已更新",
        errorFallback: "管理员状态更新失败，请稍后重试",
      },
    },
    mutationFn: (action: "disable" | "enable") =>
      runAdministratorOperation(() =>
        updateTenantAdministratorStatus(tenantId!, administratorId, action),
      ),
    onSuccess: async () => {
      await invalidateAll();
    },
  });
  const deleteMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: withId("tenant-administrator-delete", administratorId),
        action: "租户管理员删除",
        successText: "租户管理员已删除",
        errorFallback: "租户管理员删除失败，请稍后重试",
      },
    },
    mutationFn: () =>
      runAdministratorOperation(() => deleteTenantAdministrator(tenantId!, administratorId)),
    onSuccess: async () => {
      await invalidateAll();
      void navigate({ to: "/tenants-admins" });
    },
  });

  const returnToList = () => void navigate({ to: "/tenants-admins" });
  if (locatorQuery.isPending || (tenantId && detailQuery.isPending)) {
    return (
      <div className="flex justify-center py-24">
        <Spin />
      </div>
    );
  }

  const administrator = detailQuery.data;
  if (!tenantId || !administrator) {
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "租户管理员", onClick: returnToList },
          { label: administratorId },
        ]}
        title={administratorId}
        headerItems={[]}
        cards={[
          {
            key: "empty",
            title: "管理员详情",
            content: <div className="py-8 text-center text-gray-500">暂无管理员详情</div>,
          },
        ]}
        onBack={returnToList}
      />
    );
  }

  const status = tenantAdministratorStatusMeta[administrator.status];
  const operationPending =
    resendMutation.isPending ||
    passwordMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;
  const confirmStatus = () => {
    const action = administrator.status === "active" ? "disable" : "enable";
    const label = action === "disable" ? "禁用" : "启用";
    Modal.confirm({
      title: `${label}管理员 ${administrator.displayName || administrator.username}？`,
      content: action === "disable" ? "禁用后该账号将无法登录租户端。" : undefined,
      onOk: () => statusMutation.mutateAsync(action),
    });
  };
  const confirmDelete = () => {
    Modal.confirm({
      title: `删除管理员 ${administrator.displayName || administrator.username}？`,
      content: "删除后该账号将不再具备对应租户的管理员权限。",
      okButtonProps: { status: "danger" },
      onOk: () => deleteMutation.mutateAsync(),
    });
  };
  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === "resend") resendMutation.mutate();
        if (key === "password") setPasswordVisible(true);
        if (key === "status") confirmStatus();
        if (key === "delete") confirmDelete();
      }}
    >
      {administrator.isInviting ? <Menu.Item key="resend">重发邀请</Menu.Item> : null}
      <Menu.Item
        key="password"
        disabled={administrator.source !== "local" || administrator.isInviting}
      >
        重置密码
      </Menu.Item>
      {!administrator.isInviting ? (
        <Menu.Item key="status">
          {administrator.status === "active" ? "禁用账号" : "启用账号"}
        </Menu.Item>
      ) : null}
      <Menu.Item key="delete">删除管理员</Menu.Item>
    </Menu>
  );

  const infoCards: DetailInfoCard[] = [
    {
      key: "overview",
      title: "账号概览",
      content: (
        <Descriptions
          column={1}
          data={[
            { label: "账号 ID", value: administrator.id },
            { label: "用户名", value: administrator.username },
            { label: "显示名", value: administrator.displayName || "-" },
            { label: "邮箱", value: administrator.email },
            { label: "来源", value: tenantAdministratorSourceLabels[administrator.source] },
            {
              label: "邀请状态",
              value: administrator.isInviting
                ? administrator.isExpired
                  ? "已过期"
                  : "待接受"
                : "已接受",
            },
            { label: "最近登录", value: formatDateTime(administrator.lastLoginAt) },
            { label: "创建时间", value: formatDateTime(administrator.createdAt) },
            { label: "更新时间", value: formatDateTime(administrator.updatedAt) },
          ]}
        />
      ),
    },
  ];
  const detailTabs: DetailTab[] = [
    {
      key: "role",
      title: "角色与权限",
      content: (
        <TenantAdministratorRole
          tenantId={tenantId}
          administratorId={administrator.id}
          currentRole={administrator.role}
          isInviting={administrator.isInviting}
          canManage={canManage}
        />
      ),
    },
    {
      key: "audit",
      title: "操作记录",
      content: <TenantAdministratorAudit tenantId={tenantId} administratorId={administrator.id} />,
    },
  ];

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "租户管理员", onClick: returnToList },
          { label: administrator.displayName || administrator.username },
        ]}
        title={administrator.displayName || administrator.username}
        subtitle={administrator.email}
        status={<Tag color={status.color}>{status.label}</Tag>}
        headerItems={[
          {
            label: "租户",
            value: (
              <Link to="/tenants/$tenantId" params={{ tenantId }}>
                {administrator.tenant.displayName || administrator.tenant.name}
              </Link>
            ),
          },
          { label: "角色", value: tenantAdministratorRoleLabels[administrator.role] },
          { label: "来源", value: tenantAdministratorSourceLabels[administrator.source] },
          { label: "最近登录", value: formatDateTime(administrator.lastLoginAt) },
        ]}
        actions={
          <Tooltip content="更多操作">
            <Dropdown trigger="click" droplist={moreMenu} disabled={!canManage || operationPending}>
              <Button icon={<IconMoreVertical />} aria-label="更多操作" />
            </Dropdown>
          </Tooltip>
        }
        cards={infoCards}
        tabs={detailTabs}
        defaultTabKey="role"
        onBack={returnToList}
      />

      {passwordVisible ? (
        <TenantAdministratorPasswordModal
          loading={passwordMutation.isPending}
          onCancel={() => setPasswordVisible(false)}
          onSubmit={(newPassword) => passwordMutation.mutate(newPassword)}
        />
      ) : null}
    </>
  );
}
