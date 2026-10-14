import { Button, Input, Modal, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagement,
  listManagement,
  managementKeys,
  type ManagedPlanQuota,
} from "@/api/management";
import { ListDataTable, ListPageFrame, type ListColumn, type RowAction } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { PlanQuotaEditModal } from "@/components/tenant/PlanQuotaEditModal";

const columns: ListColumn<ManagedPlanQuota>[] = [
  {
    key: "quotaCode",
    dataIndex: "quotaCode",
    title: "配额编码",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "quotaValue",
    dataIndex: "quotaValue",
    title: "配额值",
    width: 160,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "createdAt",
    title: "创建时间",
    width: 180,
    render: (_, row) => formatDateTime(row.createdAt),
  },
];

export function PlanQuotaList({ planId }: { planId: number }) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");

  const [editing, setEditing] = useState<ManagedPlanQuota | "create">();
  const client = useQueryClient();
  const input = {
    page,
    pageSize,
    filters: {
      plan_id: planId,
      ...(search ? { quota_code__contains: search } : {}),
    },
  };
  const query = useQuery({
    queryKey: managementKeys.list("plan-quotas", input),
    queryFn: ({ signal }) => listManagement("plan-quotas", input, signal),
    meta: {
      errorNotification: { id: withId("management-list", "plan-quotas"), action: "套餐配额加载" },
    },
  });
  const refresh = () => client.invalidateQueries({ queryKey: managementKeys.all });
  const removal = useMutation({
    mutationFn: (id: number) => deleteManagement("plan-quotas", id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "plan-quotas"),
        action: "删除套餐配额",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    },
  });

  const rowActions: RowAction<ManagedPlanQuota>[] = [
    { key: "edit", label: "编辑", onClick: setEditing },

    {
      key: "delete",
      label: "删除",
      intent: "danger",
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        Modal.confirm({
          title: "删除套餐配额",
          content: `确认删除“${row.quotaCode ?? row.id}”？关联配置可能受影响，此操作无法在页面撤销。`,
          onOk: () => removal.mutateAsync(row.id),
        });
      },
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{ title: "套餐配额" }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              新建套餐配额
            </Button>
          ),
          filters: (
            <Space wrap>
              <Input.Search
                aria-label="搜索"
                placeholder="搜索名称"
                onSearch={(value) => {
                  setSearch(value.trim());
                  setPage(1);
                }}
                allowClear
                onClear={() => {
                  setSearch("");
                  setPage(1);
                }}
              />
            </Space>
          ),

          refresh: { onClick: () => void query.refetch(), spinning: query.isFetching },
        }}
      >
        <ListDataTable
          data={query.data?.items ?? []}
          columns={columns}
          rowActions={rowActions}
          loading={query.isPending}
          pagination={{
            page,
            pageSize,
            total: query.data?.total ?? 0,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </ListPageFrame>
      {editing && (
        <PlanQuotaEditModal
          record={editing === "create" ? undefined : editing}
          defaults={{ planId }}
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}
    </>
  );
}
