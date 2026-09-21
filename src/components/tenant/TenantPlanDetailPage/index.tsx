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
  deleteTenantPlan,
  fetchTenantPlan,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenantPlan,
  updateTenantPlanStatus,
} from "@/api/tenant";
import { DetailPageFrame, type DetailInfoCard, type DetailTab } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { tenantPlanStatusMeta } from "../apiModel";
import { TenantPlanModal } from "../TenantManagementModals";
import { useTenantManagementAccess } from "../useTenantManagementAccess";
import { TenantPlanAudit } from "./TenantPlanAudit";
import { TenantPlanBoundTenants } from "./TenantPlanBoundTenants";
import { TenantPlanQuotaLimits } from "./TenantPlanQuotaLimits";

interface TenantPlanDetailPageProps {
  planId: string;
}

async function runTenantPlanOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantPlanDetailPage({ planId }: TenantPlanDetailPageProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { canManage } = useTenantManagementAccess();
  const [editVisible, setEditVisible] = useState(false);

  const detailQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-plan-detail", planId),
        action: "配额套餐详情加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.planDetail(planId),
    queryFn: () => fetchTenantPlan(planId),
  });
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const updateMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额套餐更新",
        successText: "配额套餐已更新",
        errorFallback: "配额套餐更新失败，请稍后重试",
      },
    },
    mutationFn: (input: { name: string; description: string }) =>
      runTenantPlanOperation(() => updateTenantPlan({ planId, ...input })),
    onSuccess: async () => {
      await invalidateAll();
      setEditVisible(false);
    },
  });
  const statusMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: withId("tenant-plan-status", planId),
        action: "配额套餐状态更新",
        successText: "配额套餐状态已更新",
        errorFallback: "配额套餐状态更新失败，请稍后重试",
      },
    },
    mutationFn: (action: "activate" | "disable") =>
      runTenantPlanOperation(() => updateTenantPlanStatus(planId, action)),
    onSuccess: async () => {
      await invalidateAll();
    },
  });
  const deleteMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: withId("tenant-plan-delete", planId),
        action: "配额套餐删除",
        successText: "配额套餐已删除",
        errorFallback: "配额套餐删除失败，请稍后重试",
      },
    },
    mutationFn: () => runTenantPlanOperation(() => deleteTenantPlan(planId)),
    onSuccess: async () => {
      await invalidateAll();
      void navigate({ to: "/tenants-quotas" });
    },
  });

  const returnToList = () => void navigate({ to: "/tenants-quotas" });
  if (detailQuery.isPending) {
    return (
      <div className="flex justify-center py-24">
        <Spin />
      </div>
    );
  }

  const plan = detailQuery.data;
  if (!plan) {
    return (
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "配额策略", onClick: returnToList },
          { label: planId },
        ]}
        title={planId}
        headerItems={[]}
        cards={[
          {
            key: "empty",
            title: "套餐详情",
            content: <div className="py-8 text-center text-gray-500">暂无套餐详情</div>,
          },
        ]}
        onBack={returnToList}
      />
    );
  }

  const status = tenantPlanStatusMeta[plan.status];
  const operationPending =
    updateMutation.isPending || statusMutation.isPending || deleteMutation.isPending;
  const confirmStatus = () => {
    const action = plan.status === "active" ? "disable" : "activate";
    const label = action === "activate" ? "发布" : "停用";
    Modal.confirm({
      title: `${label}套餐 ${plan.name}？`,
      content: action === "disable" ? "停用后不能再用于新租户开通或套餐绑定。" : undefined,
      onOk: () => statusMutation.mutateAsync(action),
    });
  };
  const confirmDelete = () => {
    Modal.confirm({
      title: `删除套餐 ${plan.name}？`,
      content: "仍有关联租户时后端会拒绝删除。",
      okButtonProps: { status: "danger" },
      onOk: () => deleteMutation.mutateAsync(),
    });
  };
  const moreMenu = (
    <Menu
      onClickMenuItem={(key) => {
        if (key === "edit") setEditVisible(true);
        if (key === "status") confirmStatus();
        if (key === "delete") confirmDelete();
      }}
    >
      <Menu.Item key="edit">编辑基本信息</Menu.Item>
      {plan.status !== "disabled" ? (
        <Menu.Item key="status">{plan.status === "active" ? "停用套餐" : "发布套餐"}</Menu.Item>
      ) : null}
      {plan.status !== "active" ? <Menu.Item key="delete">删除套餐</Menu.Item> : null}
    </Menu>
  );

  const infoCards: DetailInfoCard[] = [
    {
      key: "overview",
      title: "套餐概览",
      content: (
        <Descriptions
          column={1}
          data={[
            { label: "套餐 ID", value: plan.id },
            { label: "套餐编码", value: plan.code },
            { label: "名称", value: plan.name },
            { label: "说明", value: plan.description || "-" },
            { label: "关联租户", value: plan.tenantCount },
            { label: "创建时间", value: formatDateTime(plan.createdAt) },
            { label: "更新时间", value: formatDateTime(plan.updatedAt) },
          ]}
        />
      ),
    },
  ];
  const detailTabs: DetailTab[] = [
    {
      key: "limits",
      title: "资源限额",
      content: (
        <TenantPlanQuotaLimits planId={plan.id} planStatus={plan.status} canManage={canManage} />
      ),
    },
    {
      key: "tenants",
      title: "关联租户",
      content: (
        <TenantPlanBoundTenants planId={plan.id} planStatus={plan.status} canManage={canManage} />
      ),
    },
    {
      key: "audit",
      title: "审计记录",
      content: <TenantPlanAudit planId={plan.id} />,
    },
  ];

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "配额策略", onClick: returnToList },
          { label: plan.name },
        ]}
        title={plan.name}
        subtitle={plan.code}
        status={<Tag color={status.color}>{status.label}</Tag>}
        headerItems={[
          { label: "套餐 ID", value: plan.id },
          { label: "关联租户", value: plan.tenantCount },
          { label: "创建时间", value: formatDateTime(plan.createdAt) },
          { label: "更新时间", value: formatDateTime(plan.updatedAt) },
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
        defaultTabKey="limits"
        onBack={returnToList}
      />

      {editVisible ? (
        <TenantPlanModal
          plan={plan}
          quotaMeta={[]}
          loading={updateMutation.isPending}
          onCancel={() => setEditVisible(false)}
          onSubmit={(input) => {
            if (!("code" in input)) updateMutation.mutate(input);
          }}
        />
      ) : null}
    </>
  );
}
