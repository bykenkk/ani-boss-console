import { Button, Modal, Tag } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import {
  createTenantPlan,
  deleteTenantPlan,
  fetchTenantPlans,
  fetchTenantQuotaMeta,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenantPlanStatus,
  type CreateTenantPlanInput,
  type TenantPlanListFilters,
  type TenantPlanListItem,
  type TenantPlanStatus,
} from "@/api/tenant";
import {
  DataTableNameCell,
  ListDataTable,
  ListPageFrame,
  type ListColumn,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { tenantPlanStatusMeta } from "../apiModel";
import { TenantPlanModal } from "../TenantManagementModals";
import { useTenantManagementAccess } from "../useTenantManagementAccess";

async function runTenantPlanOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantPlanListPage() {
  const queryClient = useQueryClient();
  const { canManage } = useTenantManagementAccess();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | TenantPlanStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
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
  const quotaMetaQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-quota-meta",
        action: "配额维度加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.quotaMeta,
    queryFn: fetchTenantQuotaMeta,
  });

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const createMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额策略创建",
        successText: "配额策略草稿已创建",
        errorFallback: "配额策略创建失败，请稍后重试",
      },
    },
    mutationFn: (input: CreateTenantPlanInput) =>
      runTenantPlanOperation(() => createTenantPlan(input)),
    onSuccess: async () => {
      await invalidateAll();
      setCreateVisible(false);
    },
  });
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
      width: 260,
      render: (_, plan) => (
        <DataTableNameCell
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
      width: 100,
      render: (_, plan) => {
        const meta = tenantPlanStatusMeta[plan.status];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    { title: "关联租户", dataIndex: "tenantCount", width: 110, align: "right" },
    { title: "说明", dataIndex: "description", width: 260 },
    {
      title: "更新时间",
      dataIndex: "updatedAt",
      width: 190,
      render: (value: string) => formatDateTime(value),
    },
  ];
  const data = listQuery.data || [];
  const operationPending =
    createMutation.isPending || statusMutation.isPending || deleteMutation.isPending;

  return (
    <>
      <ListPageFrame
        header={{
          title: "配额策略",
          subtitle: "维护租户配额策略、资源限额与策略绑定关系。",
          extra: (
            <Button
              type="primary"
              icon={<IconPlus />}
              disabled={!canManage || !quotaMetaQuery.data?.length}
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
            spinning: listQuery.isFetching || quotaMetaQuery.isFetching,
            onClick: () => void Promise.all([listQuery.refetch(), quotaMetaQuery.refetch()]),
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
          scroll={{ x: 1100, y: true }}
          emptyText="暂无符合条件的配额策略"
        />
      </ListPageFrame>

      {createVisible ? (
        <TenantPlanModal
          quotaMeta={quotaMetaQuery.data || []}
          loading={createMutation.isPending}
          onCancel={() => setCreateVisible(false)}
          onSubmit={(input) => {
            if ("code" in input) createMutation.mutate(input);
          }}
        />
      ) : null}
    </>
  );
}
