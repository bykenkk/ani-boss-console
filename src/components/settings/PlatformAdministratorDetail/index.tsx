import { Button, Dropdown, Menu, Modal, Spin, Tooltip } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  deletePlatformAdministrator,
  disablePlatformAdministrator,
  enablePlatformAdministrator,
  fetchPlatformAdministrator,
  fetchPlatformAdministratorAuditLogs,
  fetchPlatformAdministratorRoles,
  getPlatformAdministratorErrorMessage,
  platformAdministratorQueryKeys,
  resetPlatformAdministratorPassword,
  updatePlatformAdministratorRole,
} from "@/api/platform-admins";
import { getAccessTokenRoles } from "@/stores/auth";
import { useAuthState } from "@/hooks/useAuthState";
import { DetailPageFrame, type DetailInfoCard, type DetailTab } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { AccountOverview } from "./AccountOverview";
import { OperationRecords } from "./OperationRecords";
// import { PermissionMatrix } from "./PermissionMatrix";
import {
  PlatformAdministratorPasswordModal,
  PlatformAdministratorRoleModal,
} from "../PlatformAdministratorsPage/PlatformAdministratorModals";
import { PlatformAdministratorStatusBadge } from "../PlatformAdministratorStatusBadge";
import { platformAdministratorRoleLabels, platformAdministratorSourceLabels } from "../model";

interface PlatformAdministratorDetailProps {
  userId: string;
}

async function runAdministratorOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getPlatformAdministratorErrorMessage(error));
  }
}

export function PlatformAdministratorDetail({ userId }: PlatformAdministratorDetailProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const authState = useAuthState();
  const [roleVisible, setRoleVisible] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const canManage =
    authState.developmentBypass ||
    getAccessTokenRoles(authState.tokens?.access_token).includes("platform-admin");

  const detailQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("platform-administrator", userId),
        action: "平台运营账号详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.detail(userId),
    queryFn: () => fetchPlatformAdministrator(userId),
  });
  const rolesQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-administrator-roles",
        action: "平台角色权限加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.roles,
    queryFn: fetchPlatformAdministratorRoles,
  });
  const auditQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("platform-administrator-audit", userId),
        action: "账号操作记录加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAdministratorQueryKeys.auditLogs(userId),
    queryFn: () => fetchPlatformAdministratorAuditLogs(userId),
  });

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: platformAdministratorQueryKeys.all });
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
      setRoleVisible(false);
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
      setPasswordVisible(false);
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
    mutationFn: ({ status }: { status: "active" | "disabled" }) =>
      runAdministratorOperation(() =>
        status === "active"
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
    mutationFn: () => runAdministratorOperation(() => deletePlatformAdministrator(userId)),
    onSuccess: async () => {
      await invalidateAll();
      void navigate({ to: "/platform-admins" });
    },
  });

  const returnToList = () => {
    void navigate({ to: "/platform-admins" });
  };

  if (detailQuery.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spin />
      </div>
    );
  }

  const detail = detailQuery.data;
  if (!detail) {
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "系统设置" },
          { label: "平台管理员", onClick: returnToList },
          { label: userId },
        ]}
        title={userId}
        headerItems={[
          { label: "角色", value: "-" },
          { label: "来源", value: "-" },
          { label: "最近登录", value: "-" },
          { label: "创建时间", value: "-" },
        ]}
        cards={[
          {
            key: "overview",
            title: "账号概览",
            content: <div className="py-8 text-center text-gray-500">暂无账号详情</div>,
          },
        ]}
        onBack={returnToList}
      />
    );
  }

  const operationPending =
    roleMutation.isPending ||
    passwordMutation.isPending ||
    statusMutation.isPending ||
    deleteMutation.isPending;
  const confirmStatusChange = () => {
    const action = detail.status === "active" ? "禁用" : "启用";
    Modal.confirm({
      title: `${action}账号 ${detail.displayName}？`,
      content:
        detail.status === "active"
          ? "禁用后该账号将无法登录管理端。"
          : "启用后该账号可恢复登录管理端。",
      okButtonProps: detail.status === "active" ? { status: "danger" } : undefined,
      onOk: () => statusMutation.mutateAsync({ status: detail.status }),
    });
  };

  const confirmDelete = () => {
    Modal.confirm({
      title: `删除账号 ${detail.displayName}？`,
      content: "该操作会软删除账号；至少需要保留一名活跃的平台超级管理员。",
      okButtonProps: { status: "danger" },
      onOk: () => deleteMutation.mutateAsync(),
    });
  };

  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === "role") setRoleVisible(true);
        if (key === "password") setPasswordVisible(true);
        if (key === "status") confirmStatusChange();
        if (key === "delete") confirmDelete();
      }}
    >
      <Menu.Item key="role">修改角色</Menu.Item>
      <Menu.Item key="password" disabled={detail.source !== "local"}>
        重置密码
      </Menu.Item>
      <Menu.Item key="status">{detail.status === "active" ? "禁用账号" : "启用账号"}</Menu.Item>
      <Menu.Item key="delete">删除账号</Menu.Item>
    </Menu>
  );

  const infoCards: DetailInfoCard[] = [
    {
      key: "overview",
      title: "账号概览",
      content: <AccountOverview detail={detail} />,
    },
  ];

  const detailTabs: DetailTab[] = [
    /* 权限功能暂时隐藏，恢复时同时还原下方 defaultTabKey。
    {
      key: "permissions",
      title: "权限",
      content: (
        <PermissionMatrix
          currentRole={detail.role}
          canManage={canManage && !operationPending}
          onChangeRole={() => setRoleVisible(true)}
        />
      ),
    },
    */
    {
      key: "operations",
      title: "操作记录",
      content: <OperationRecords records={auditQuery.data || []} loading={auditQuery.isPending} />,
    },
  ];

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "系统设置" },
          { label: "平台管理员", onClick: returnToList },
          { label: detail.displayName || detail.username },
        ]}
        title={detail.displayName || detail.username}
        subtitle={detail.email || detail.username}
        status={<PlatformAdministratorStatusBadge status={detail.status} />}
        headerItems={[
          { label: "角色", value: platformAdministratorRoleLabels[detail.role] },
          { label: "来源", value: platformAdministratorSourceLabels[detail.source] },
          { label: "最近登录", value: formatDateTime(detail.lastLoginAt) },
          { label: "创建时间", value: formatDateTime(detail.createdAt) },
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
        /* defaultTabKey="permissions" */
        defaultTabKey="operations"
        onBack={returnToList}
      />

      <PlatformAdministratorRoleModal
        target={roleVisible ? detail : null}
        loading={roleMutation.isPending}
        roles={rolesQuery.data || []}
        onCancel={() => setRoleVisible(false)}
        onSubmit={(roleId) => roleMutation.mutate({ userId, roleId })}
      />
      <PlatformAdministratorPasswordModal
        target={passwordVisible ? detail : null}
        loading={passwordMutation.isPending}
        onCancel={() => setPasswordVisible(false)}
        onSubmit={(newPassword) => passwordMutation.mutate({ userId, newPassword })}
      />
    </>
  );
}
