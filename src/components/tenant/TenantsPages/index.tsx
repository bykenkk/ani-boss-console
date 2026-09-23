import { Button, Modal } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useDeferredValue, useMemo, useState } from "react";
import {
  createTenant,
  fetchAvailableTenantPlans,
  fetchTenants,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  updateTenantStatus,
  type CreateTenantInput,
  type TenantListFilters,
  type TenantListItem,
  type TenantStatus,
} from "@/api/tenant";
import {
  ResourceNameId,
  ListDataTable,
  ListPageFrame,
  type ListColumn,
  StatusBadge,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { TenantCreateModal } from "../TenantCreateModal";
import { tenantStatusMeta } from "../apiModel";
import { useTenantManagementAccess } from "@/hooks/useTenantManagementAccess";

interface StatusMutationInput {
  tenantId: string;
  action: "freeze" | "unfreeze" | "disable";
}

async function runTenantOperation<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantsPages() {
  const queryClient = useQueryClient();
  const { canManage } = useTenantManagementAccess();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"all" | TenantStatus>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [createVisible, setCreateVisible] = useState(false);
  const deferredKeyword = useDeferredValue(keyword.trim());

  const filters = useMemo<TenantListFilters>(() => {
    const result: TenantListFilters = {};
    if (status !== "all") result.status = status;
    if (deferredKeyword) result.search = deferredKeyword;
    return result;
  }, [deferredKeyword, status]);

  const listQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenants",
        action: "租户列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantList(filters),
    queryFn: () => fetchTenants(filters),
  });
  const plansQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-available-plans",
        action: "可用配额策略加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.availablePlans,
    queryFn: fetchAvailableTenantPlans,
  });

  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const createMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "租户开通",
        successText: "租户已开通",
        errorFallback: "租户开通失败，请稍后重试",
      },
    },
    mutationFn: (input: CreateTenantInput) => runTenantOperation(() => createTenant(input)),
    onSuccess: async () => {
      await invalidateAll();
      setCreateVisible(false);
    },
  });
  const statusMutation = useMutation({
    meta: {
      feedback: {
        channel: "notification",
        id: "tenant-status",
        action: "租户状态更新",
        successText: "租户状态已更新",
        errorFallback: "租户状态更新失败，请稍后重试",
      },
    },
    mutationFn: ({ tenantId, action }: StatusMutationInput) =>
      runTenantOperation(() => updateTenantStatus(tenantId, action)),
    onSuccess: invalidateAll,
  });

  const confirmStatus = (tenant: TenantListItem) => {
    const action = tenant.status === "frozen" ? "unfreeze" : "freeze";
    const actionLabel = action === "freeze" ? "冻结" : "解冻";
    Modal.confirm({
      title: `${actionLabel}租户 ${tenant.name}？`,
      content: action === "freeze" ? "冻结后租户侧将无法继续创建资源。" : undefined,
      onOk: () => statusMutation.mutateAsync({ tenantId: tenant.id, action }),
    });
  };

  const confirmDisable = (tenant: TenantListItem) => {
    Modal.confirm({
      title: `禁用租户 ${tenant.name}？`,
      content: "禁用是不可逆终态；存在运行资源时后端会拒绝该操作。",
      okButtonProps: { status: "danger" },
      onOk: () => statusMutation.mutateAsync({ tenantId: tenant.id, action: "disable" }),
    });
  };

  const columns: ListColumn<TenantListItem>[] = [
    {
      key: "name",
      title: "租户",
      width: 200,
      render: (_, tenant) => (
        <ResourceNameId
          name={
            <Link to="/tenants/$tenantId" params={{ tenantId: tenant.id }}>
              {tenant.displayName}
            </Link>
          }
          id={tenant.name}
        />
      ),
    },
    {
      title: "状态",
      width: 120,
      render: (_, tenant) => {
        const meta = tenantStatusMeta[tenant.status];
        return <StatusBadge tone={meta.tone} value={meta.label} />;
      },
    },
    {
      title: "配额策略",
      dataIndex: "planCode",
      width: 100,
      editable: true,
    },
    {
      title: "管理员数",
      dataIndex: "administratorCount",
      width: 80,
      editable: true,
    },
    {
      title: "开通时间",
      dataIndex: "createdAt",
      width: 150,
      render: (value: string) => formatDateTime(value),
    },
  ];

  const data = listQuery.data || [];
  const operationPending = createMutation.isPending || statusMutation.isPending;

  return (
    <>
      <ListPageFrame
        header={{
          title: "租户列表",
          subtitle: "管理租户开通、基本信息、认证、配额与生命周期。",
          extra: (
            <Button
              type="primary"
              icon={<IconPlus />}
              disabled={!canManage || !plansQuery.data?.length}
              title={canManage ? undefined : "当前账号只有只读权限"}
              onClick={() => setCreateVisible(true)}
            >
              开通租户
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
            { value: "frozen", label: "冻结" },
            { value: "disabled", label: "禁用" },
          ],
        }}
        toolbar={{
          search: {
            fields: [{ value: "keyword", label: "关键词" }],
            field: "keyword",
            value: keyword,
            placeholder: "搜索租户标识或显示名",
            onFieldChange: () => undefined,
            onChange: (value) => {
              setKeyword(value);
              setPage(1);
            },
          },
          refresh: {
            spinning: listQuery.isFetching || plansQuery.isFetching,
            onClick: () => void Promise.all([listQuery.refetch(), plansQuery.refetch()]),
          },
          tools: <span className="text-xs text-gray-500">共 {data.length} 个租户</span>,
        }}
      >
        <ListDataTable
          rowKey="id"
          columns={columns}
          rowActions={[
            {
              key: "status",
              label: (tenant) => (tenant.status === "frozen" ? "解冻" : "冻结"),
              widthLabel: "解冻",
              visible: (tenant) => tenant.status !== "disabled",
              disabled: () => !canManage || operationPending,
              onClick: confirmStatus,
            },
            {
              key: "disable",
              label: "禁用",
              intent: "danger",
              visible: (tenant) => tenant.status !== "disabled",
              disabled: () => !canManage || operationPending,
              onClick: confirmDisable,
            },
          ]}
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
          scroll={{ x: 1000, y: true }}
          emptyText="暂无符合条件的租户"
        />
      </ListPageFrame>

      {createVisible ? (
        <TenantCreateModal
          loading={createMutation.isPending}
          plans={plansQuery.data || []}
          onCancel={() => setCreateVisible(false)}
          onSubmit={(input) => createMutation.mutate(input)}
        />
      ) : null}
    </>
  );
}
