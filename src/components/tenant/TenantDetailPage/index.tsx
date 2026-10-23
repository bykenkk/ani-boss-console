import { Button, Descriptions, Dropdown, Menu, Modal, Spin, Tooltip } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  fetchTenant,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenantStatus,
  type TenantStatus,
} from "@/api/tenant";
import {
  DetailPageFrame,
  type DetailInfoCard,
  type DetailTab,
  type StatusBadgeTone,
  StatusBadge,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { TenantProfileModal } from "@/components/tenant/TenantProfileModal";
import { TenantAuditRecords } from "./TenantAuditRecords";
// import { TenantIdentitySettings } from "./TenantIdentitySettings";
import { TenantLifecycleRecords } from "./TenantLifecycleRecords";
import { TenantQuotaManagement } from "./TenantQuotaManagement";
import { TenantScopedAdministrators } from "./TenantScopedAdministrators";

interface TenantDetailPageProps {
  tenantId: string;
}

const tenantStatusMeta: Record<TenantStatus, { label: string; tone: StatusBadgeTone }> = {
  active: { label: "活跃", tone: "success" },
  frozen: { label: "冻结", tone: "warning" },
  disabled: { label: "禁用", tone: "default" },
};

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
  const statusMutation = useMutation({
    meta: {
      feedback: (variables) => {
        const label =
          variables === "freeze" ? "冻结租户" : variables === "unfreeze" ? "解冻租户" : "禁用租户";
        return {
          channel: "notification",
          id: withId("tenant-status", tenantId),
          action: label,
          successText: label + "成功",
          errorFallback: label + "失败，请稍后重试",
        };
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
  const operationPending = statusMutation.isPending;
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
            { label: "配额策略", value: tenant.planCode },
            { label: "用户 / 管理员", value: `${tenant.userCount} / ${tenant.administratorCount}` },
            { label: "创建时间", value: formatDateTime(tenant.createdAt) },
            { label: "更新时间", value: formatDateTime(tenant.updatedAt) },
          ]}
        />
      ),
    },
  ];
  const detailTabs: DetailTab[] = [
    /* 认证与安全功能暂时隐藏，恢复时同时还原下方 defaultTabKey。
    {
      key: "identity",
      title: "认证与安全",
      content: <TenantIdentitySettings tenantId={tenant.id} />,
    },
    */
    {
      key: "quota",
      title: "配额",
      content: <TenantQuotaManagement tenantId={tenant.id} />,
    },
    {
      key: "administrators",
      title: "租户管理员",
      content: (
        <TenantScopedAdministrators
          tenantId={tenant.id}
          tenantName={tenant.name}
          tenantDisplayName={tenant.displayName}
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
      title: "操作日志",
      content: <TenantAuditRecords tenantId={tenant.id} />,
    },
  ];
  // const defaultTabKey = "identity";
  const defaultTabKey = "quota";

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
        status={<StatusBadge tone={status.tone} value={status.label} />}
        headerItems={[
          { label: "用户数", value: tenant.userCount },
          { label: "管理员数", value: tenant.administratorCount },
          { label: "更新时间", value: formatDateTime(tenant.updatedAt) },
        ]}
        actions={
          <Tooltip content="更多操作">
            <Dropdown trigger="click" droplist={moreMenu} disabled={operationPending}>
              <Button icon={<IconMoreVertical />} aria-label="更多操作" title="更多操作" />
            </Dropdown>
          </Tooltip>
        }
        cards={infoCards}
        tabs={detailTabs}
        defaultTabKey={defaultTabKey}
        onBack={returnToList}
      />

      {profileVisible ? (
        <TenantProfileModal
          tenantId={tenant.id}
          displayName={tenant.displayName}
          contactEmail={tenant.contactEmail}
          onCancel={() => setProfileVisible(false)}
          onSuccess={() => setProfileVisible(false)}
        />
      ) : null}
    </>
  );
}
