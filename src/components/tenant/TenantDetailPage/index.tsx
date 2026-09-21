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
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  fetchTenant,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenant,
  updateTenantStatus,
  type UpdateTenantInput,
} from "@/api/tenant";
import { DetailPageFrame, type DetailInfoCard, type DetailTab } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { tenantStatusMeta } from "../apiModel";
import { TenantProfileModal } from "../TenantManagementModals";
import { useTenantManagementAccess } from "../useTenantManagementAccess";
import { TenantAuditRecords } from "./TenantAuditRecords";
import { TenantIdentitySettings } from "./TenantIdentitySettings";
import { TenantLifecycleRecords } from "./TenantLifecycleRecords";
import { TenantQuotaManagement } from "./TenantQuotaManagement";
import { TenantScopedAdministrators } from "./TenantScopedAdministrators";

interface TenantDetailPageProps {
  tenantId: string;
}

async function runTenantOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantDetailPage({ tenantId }: TenantDetailPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canManage } = useTenantManagementAccess();
  const [profileVisible, setProfileVisible] = useState(false);
  const detailQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-detail", tenantId),
        action: "租户详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantDetail(tenantId),
    queryFn: () => fetchTenant(tenantId),
  });
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const profileMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "租户信息更新",
        successText: "租户信息已更新",
        errorFallback: "租户信息更新失败，请稍后重试",
      },
    },
    mutationFn: (input: UpdateTenantInput) => runTenantOperation(() => updateTenant(input)),
    onSuccess: async () => {
      await invalidateAll();
      setProfileVisible(false);
    },
  });
  const statusMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: withId("tenant-status", tenantId),
        action: "租户状态更新",
        successText: "租户状态已更新",
        errorFallback: "租户状态更新失败，请稍后重试",
      },
    },
    mutationFn: (action: "freeze" | "unfreeze" | "disable") =>
      runTenantOperation(() => updateTenantStatus(tenantId, action)),
    onSuccess: invalidateAll,
  });

  const returnToList = () => void navigate({ to: "/tenants" });
  if (detailQuery.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spin />
      </div>
    );
  }

  const tenant = detailQuery.data;
  if (!tenant) {
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "租户列表", onClick: returnToList },
          { label: tenantId },
        ]}
        title={tenantId}
        headerItems={[]}
        cards={[
          {
            key: "empty",
            title: "租户详情",
            content: <div className="py-8 text-center text-gray-500">暂无租户详情</div>,
          },
        ]}
        onBack={returnToList}
      />
    );
  }

  const status = tenantStatusMeta[tenant.status];
  const operationPending = profileMutation.isPending || statusMutation.isPending;
  const confirmStatusChange = (action: "freeze" | "unfreeze" | "disable") => {
    const label = action === "freeze" ? "冻结" : action === "unfreeze" ? "解冻" : "禁用";
    Modal.confirm({
      title: `${label}租户 ${tenant.displayName}？`,
      content:
        action === "disable" ? "禁用是不可逆终态；存在运行资源时后端会拒绝该操作。" : undefined,
      okButtonProps: action === "disable" ? { status: "danger" } : undefined,
      onOk: () => statusMutation.mutateAsync(action),
    });
  };
  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === "profile") setProfileVisible(true);
        if (key === "status")
          confirmStatusChange(tenant.status === "frozen" ? "unfreeze" : "freeze");
        if (key === "disable") confirmStatusChange("disable");
      }}
    >
      <Menu.Item key="profile">编辑基本信息</Menu.Item>
      {tenant.status !== "disabled" ? (
        <Menu.Item key="status">{tenant.status === "frozen" ? "解冻租户" : "冻结租户"}</Menu.Item>
      ) : null}
      {tenant.status !== "disabled" ? <Menu.Item key="disable">禁用租户</Menu.Item> : null}
    </Menu>
  );
  const infoCards: DetailInfoCard[] = [
    {
      key: "basic",
      title: "基本信息",
      content: (
        <Descriptions
          column={1}
          data={[
            { label: "租户 ID", value: tenant.id },
            { label: "租户标识", value: tenant.name },
            { label: "显示名", value: tenant.displayName },
            { label: "联系邮箱", value: tenant.contactEmail || "-" },
            { label: "套餐编码", value: tenant.planCode },
            { label: "用户 / 管理员", value: `${tenant.userCount} / ${tenant.administratorCount}` },
            { label: "创建时间", value: formatDateTime(tenant.createdAt) },
            { label: "更新时间", value: formatDateTime(tenant.updatedAt) },
          ]}
        />
      ),
    },
  ];
  const detailTabs: DetailTab[] = [
    {
      key: "identity",
      title: "认证与安全",
      content: <TenantIdentitySettings tenantId={tenant.id} canManage={canManage} />,
    },
    {
      key: "quota",
      title: "配额与申请",
      content: <TenantQuotaManagement tenantId={tenant.id} canManage={canManage} />,
    },
    {
      key: "administrators",
      title: "租户管理员",
      content: (
        <TenantScopedAdministrators
          tenantId={tenant.id}
          tenantName={tenant.name}
          tenantDisplayName={tenant.displayName}
          canManage={canManage}
        />
      ),
    },
    {
      key: "lifecycle",
      title: "生命周期",
      content: <TenantLifecycleRecords tenantId={tenant.id} />,
    },
    {
      key: "audit",
      title: "审计记录",
      content: <TenantAuditRecords tenantId={tenant.id} />,
    },
  ];

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "租户列表", onClick: returnToList },
          { label: tenant.displayName },
        ]}
        title={tenant.displayName}
        subtitle={tenant.name}
        status={<Tag color={status.color}>{status.label}</Tag>}
        headerItems={[
          { label: "套餐", value: tenant.planCode },
          { label: "用户数", value: tenant.userCount },
          { label: "管理员数", value: tenant.administratorCount },
          { label: "更新时间", value: formatDateTime(tenant.updatedAt) },
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
        defaultTabKey="identity"
        onBack={returnToList}
      />

      {profileVisible ? (
        <TenantProfileModal
          tenantId={tenant.id}
          displayName={tenant.displayName}
          contactEmail={tenant.contactEmail}
          loading={profileMutation.isPending}
          onCancel={() => setProfileVisible(false)}
          onSubmit={(input) => profileMutation.mutate(input)}
        />
      ) : null}
    </>
  );
}
