import { SummaryStrip } from "@/components/common";
import { Button, Modal } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import {
  deleteTenantPlan,
  fetchTenantPlans,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenantPlanStatus,
  type TenantPlanListFilters,
  type TenantPlanListItem,
  type TenantPlanStatus,
} from "@/api/tenant";
import {
  ResourceNameId,
  ListDataTable,
  ListPageFrame,
  type ListColumn,
  StatusBadge,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { tenantPlanStatusMeta } from "../apiModel";
import { TenantPlanCreateModal } from "@/components/tenant/TenantPlanCreateModal";
import { useTenantManagementAccess } from "@/hooks/useTenantManagementAccess";

async function runTenantPlanOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantPlansPages() {
  const queryClient = useQueryClient();
  const { canManage } = useTenantManagementAccess();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | TenantPlanStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [createVisible, setCreateVisible] = useState(false);
  const deferredKeyword = useDeferredValue(keyword.trim());
  const filters = useMemo<TenantPlanListFilters>(() => {
    const next: TenantPlanListFilters = {};
    if (status !== "all") next.status = status;
    if (deferredKeyword) next.search = deferredKeyword;
    return next;
  }, [deferredKeyword, status]);

  const listQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-plans",
        action: "配额策略加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.planList(filters),
    queryFn: () => fetchTenantPlans(filters),
  });
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const statusMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "tenant-plan-status",
        action: "配额策略状态更新",
        successText: "配额策略状态已更新",
        errorFallback: "配额策略状态更新失败，请稍后重试",
      },
    },
    mutationFn: ({ planId, action }: { planId: string; action: "activate" | "disable" }) =>
      runTenantPlanOperation(() => updateTenantPlanStatus(planId, action)),
    onSuccess: async () => {
      await invalidateAll();
    },
  });
  const deleteMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "tenant-plan-delete",
        action: "配额策略删除",
        successText: "配额策略已删除",
        errorFallback: "配额策略删除失败，请稍后重试",
      },
    },
    mutationFn: (planId: string) => runTenantPlanOperation(() => deleteTenantPlan(planId)),
    onSuccess: async () => {
      await invalidateAll();
    },
  });

  const confirmStatus = (plan: TenantPlanListItem) => {
    const action = plan.status === "active" ? "disable" : "activate";
    const label = action === "activate" ? "发布" : "停用";
    Modal.confirm({
      title: `${label}配额策略 ${plan.name}？`,
      content: action === "disable" ? "停用后不能再用于新租户开通或策略绑定。" : undefined,
      onOk: () => statusMutation.mutateAsync({ planId: plan.id, action }),
    });
  };
  const confirmDelete = (plan: TenantPlanListItem) => {
    Modal.confirm({
      title: `删除配额策略 ${plan.name}？`,
      content: "仍有关联租户时后端会拒绝删除。",
      okButtonProps: { status: "danger" },
      onOk: () => deleteMutation.mutateAsync(plan.id),
    });
  };

  const columns: ListColumn<TenantPlanListItem>[] = [
    {
      key: "name",
      title: "策略名称",
      width: 200,
      render: (_, plan) => (
        <ResourceNameId
          avatarText={plan.name}
          name={
            <Link to="/tenants-quotas/$planCode" params={{ planCode: plan.id }}>
              {plan.name}
            </Link>
          }
          id={plan.code}
        />
      ),
    },
    {
      title: "状态",
      width: 120,
      render: (_, plan) => {
        const meta = tenantPlanStatusMeta[plan.status];
        return <StatusBadge tone={meta.tone} value={meta.label} />;
      },
    },
    {
      title: "关联租户",
      dataIndex: "tenantCount",
      width: 80,
      ellipsis: true,
    },
    {
      title: "说明",
      dataIndex: "description",
      width: 200,
      ellipsis: true,
    },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 150,
      render: (value: string) => formatDateTime(value),
    },
  ];
  const data = listQuery.data || [];
  const operationPending = statusMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <ListPageFrame
        summary={
          <SummaryStrip
            pending={listQuery.isPending}
            items={[
              { label: "策略总数", value: data.length, unit: "条", note: "当前筛选范围" },
              {
                label: "已发布",
                value: data.filter((t) => t.status === "active").length,
                unit: "条",
              },
              { label: "草稿", value: data.filter((t) => t.status === "draft").length, unit: "条" },
              { label: "绑定租户", value: data.reduce((n, t) => n + t.tenantCount, 0), unit: "个" },
            ]}
          />
        }
        header={{
          title: "配额策略",
          subtitle: "维护租户配额策略、资源限额与策略绑定关系。",
          extra: (
            <Button
              type="primary"
              icon={<IconPlus />}
              disabled={!canManage}
              onClick={() => setCreateVisible(true)}
            >
              新建策略
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
            { value: "draft", label: "草稿" },
            { value: "active", label: "已发布" },
            { value: "disabled", label: "已停用" },
          ],
        }}
        toolbar={{
          search: {
            fields: [{ value: "keyword", label: "关键词" }],
            field: "keyword",
            value: keyword,
            placeholder: "搜索策略编码或名称",
            onFieldChange: () => undefined,
            onChange: (value) => {
              setKeyword(value);
              setPage(1);
            },
          },
          refresh: {
            spinning: listQuery.isFetching,
            onClick: () => void listQuery.refetch(),
          },
          tools: <span className="text-xs text-gray-500">共 {data.length} 条配额策略</span>,
        }}
      >
        <ListDataTable
          rowKey="id"
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
              key: "status",
              label: (plan) => (plan.status === "active" ? "停用" : "发布"),
              widthLabel: "发布",
              visible: (plan) => plan.status !== "disabled",
              disabled: () => !canManage || operationPending,
              onClick: confirmStatus,
            },
            {
              key: "delete",
              label: "删除",
              intent: "danger",
              visible: (plan) => plan.status !== "active",
              disabled: () => !canManage || operationPending,
              onClick: confirmDelete,
            },
          ]}
          emptyText="暂无符合条件的配额策略"
        />
      </ListPageFrame>

      {createVisible ? (
        <TenantPlanCreateModal
          onCancel={() => setCreateVisible(false)}
          onSuccess={() => setCreateVisible(false)}
        />
      ) : null}
    </>
  );
}
