import { Button, Input, Modal, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deletePlanQuota,
  listPlanQuotas,
  listQuotaDefinitionOptions,
  planKeys,
  type PlanQuota,
} from "@/api/plans";
import { DataTable, TableSectionFrame, type ListColumn, type RowAction } from "@/components/common";
import { PlanQuotaEditModal } from "@/components/tenant/PlanQuotaEditModal";
import { QuotaEnforcementBadge } from "@/components/tenant/QuotaEnforcementBadge";
import { useListPagination } from "@/hooks/useListPagination";
import { withId } from "@/lib/id";

interface PlanQuotaListProps {
  planId: number;
  onModalVisibilityChange: (visible: boolean) => void;
}

export function PlanQuotaList({ planId, onModalVisibilityChange }: PlanQuotaListProps) {
  const [search, setSearch] = useState("");
  const { page, pageSize, setPage, setPageSize } = useListPagination(
    withId("plan-quotas", planId, search),
  );
  const [editing, setEditing] = useState<PlanQuota | "create">();
  const changeEditing = (value: PlanQuota | "create" | undefined) => {
    setEditing(value);
    onModalVisibilityChange(value !== undefined);
  };
  const client = useQueryClient();
  const input = { page, pageSize, search };
  const query = useQuery({
    queryKey: planKeys.quotaList(planId, input),
    queryFn: ({ signal }) => listPlanQuotas(planId, input, signal),
    meta: {
      errorNotification: { id: withId("plan-quotas", planId), action: "套餐配额加载" },
    },
  });
  const catalog = useQuery({
    queryKey: planKeys.quotaDefinitions,
    queryFn: ({ signal }) => listQuotaDefinitionOptions({}, signal),
    meta: {
      errorNotification: { id: "quota-definitions", action: "配额目录加载" },
    },
  });
  const definitions = catalog.data?.items ?? [];
  const columns: ListColumn<PlanQuota>[] = [
    { key: "quotaCode", dataIndex: "quotaCode", title: "配额编码", width: 220, ellipsis: true },
    {
      key: "name",
      title: "配额类型",
      width: 200,
      ellipsis: true,
      render: (_, row) => definitions.find((item) => item.code === row.quotaCode)?.displayName,
    },
    { key: "quotaValue", dataIndex: "quotaValue", title: "配额值", width: 200, ellipsis: true },
    {
      key: "unit",
      title: "单位",
      width: 120,
      render: (_, row) => definitions.find((item) => item.code === row.quotaCode)?.unit,
    },
    {
      key: "enforcement",
      title: "执行级别",
      width: 120,
      render: (_, row) => (
        <QuotaEnforcementBadge
          enforcement={definitions.find((item) => item.code === row.quotaCode)?.enforcement}
        />
      ),
    },
  ];
  const removal = useMutation({
    mutationFn: deletePlanQuota,
    meta: {
      feedback: {
        channel: "notification",
        id: withId("plan-quota-delete", planId),
        action: "删除套餐配额",
      },
    },
    onSuccess: async () => {
      if (query.data?.items?.length === 1 && page > 1) setPage(page - 1);
      await client.invalidateQueries({ queryKey: planKeys.all });
    },
  });
  const rowActions: RowAction<PlanQuota>[] = [
    { key: "edit", label: "编辑", onClick: changeEditing },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        onModalVisibilityChange(true);
        Modal.confirm({
          title: "删除套餐配额",
          content: `确认删除“${row.quotaCode ?? row.id}”？删除后将移除该套餐的此项配额配置。`,
          onOk: () => removal.mutateAsync(row.id),
          afterClose: () => onModalVisibilityChange(false),
        });
      },
    },
  ];
  return (
    <>
      <TableSectionFrame
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => changeEditing("create")}>
              新建套餐配额
            </Button>
          ),
          filters: (
            <Space>
              <Input.Search
                aria-label="搜索配额编码"
                placeholder="搜索配额编码"
                onSearch={(value) => setSearch(value.trim())}
                allowClear
                onClear={() => setSearch("")}
              />
            </Space>
          ),
          refresh: {
            onClick: async () => {
              await Promise.all([query.refetch(), catalog.refetch()]);
            },
            spinning: query.isFetching || catalog.isFetching,
          },
        }}
      >
        <DataTable
          data={query.data?.items ?? []}
          columns={columns}
          rowActions={rowActions}
          loading={query.isPending}
          pagination={{
            page,
            pageSize,
            total: Number(query.data?.total ?? "0"),
            onPageChange: setPage,
            onPageSizeChange: setPageSize,
          }}
        />
      </TableSectionFrame>
      {editing && (
        <PlanQuotaEditModal
          record={editing === "create" ? undefined : editing}
          planId={planId}
          onCancel={() => changeEditing(undefined)}
          onSuccess={() => changeEditing(undefined)}
        />
      )}
    </>
  );
}
