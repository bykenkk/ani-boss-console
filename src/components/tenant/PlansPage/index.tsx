import { Button, Input, Modal, Space } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteManagement,
  listManagement,
  managementKeys,
  type ManagedPlan,
} from "@/api/management";
import { ListDataTable, ListPageFrame, type ListColumn, type RowAction } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { PlanEditModal } from "@/components/tenant/PlanEditModal";

import { PlanQuotasModal } from "@/components/tenant/PlanQuotasModal";

const columns: ListColumn<ManagedPlan>[] = [
  {
    key: "name",
    dataIndex: "name",
    title: "名称",
    width: 200,
    ellipsis: true,
    render: (value) => String(value ?? "-"),
  },
  {
    key: "version",
    dataIndex: "version",
    title: "版本",
    width: 160,
    ellipsis: true,
    render: (value: string | undefined) =>
      (({ FREE: "免费版", STANDARD: "标准版", ENTERPRISE: "企业版" }) as Record<string, string>)[
        value ?? ""
      ] ??
      value ??
      "-",
  },
  {
    key: "expiryPolicy",
    dataIndex: "expiryPolicy",
    title: "到期策略",
    width: 160,
    ellipsis: true,
    render: (value: string | undefined) =>
      (({ READONLY: "只读", BLOCK_LOGIN: "禁止登录", FREEZE: "冻结" }) as Record<string, string>)[
        value ?? ""
      ] ??
      value ??
      "-",
  },
  {
    key: "dataRetentionDays",
    dataIndex: "dataRetentionDays",
    title: "数据保留天数",
    width: 180,
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

export function PlansPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");

  const [plan, setPlan] = useState<ManagedPlan>();
  const [editing, setEditing] = useState<ManagedPlan | "create">();
  const client = useQueryClient();
  const input = {
    page,
    pageSize,
    filters: {
      ...(search ? { name__contains: search } : {}),
    },
  };
  const query = useQuery({
    queryKey: managementKeys.list("plans", input),
    queryFn: ({ signal }) => listManagement("plans", input, signal),
    meta: { errorNotification: { id: withId("management-list", "plans"), action: "套餐管理加载" } },
  });
  const refresh = () => client.invalidateQueries({ queryKey: managementKeys.all });
  const removal = useMutation({
    mutationFn: (id: number) => deleteManagement("plans", id),
    meta: {
      feedback: {
        channel: "notification",
        id: withId("management-delete", "plans"),
        action: "删除套餐",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && page > 1) setPage(page - 1);
      await refresh();
    },
  });

  const rowActions: RowAction<ManagedPlan>[] = [
    { key: "quotas", label: "配额", onClick: setPlan },
    { key: "edit", label: "编辑", onClick: setEditing },

    {
      key: "delete",
      label: "删除",
      intent: "danger",
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        Modal.confirm({
          title: "删除套餐",
          content: `确认删除“${row.name ?? row.id}”？关联配置可能受影响，此操作无法在页面撤销。`,
          onOk: () => removal.mutateAsync(row.id),
        });
      },
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{
          title: "套餐管理",
          subtitle: "维护租户套餐及配额，配置套餐版本、到期策略和数据保留周期。",
        }}
        toolbar={{
          actions: (
            <Button type="primary" onClick={() => setEditing("create")}>
              新建套餐
            </Button>
          ),
          filters: (
            <Space>
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
            total: query.data ? Number(query.data.total) : 0,
            onPageChange: setPage,
            onPageSizeChange: (size) => {
              setPageSize(size);
              setPage(1);
            },
          }}
        />
      </ListPageFrame>
      {editing && (
        <PlanEditModal
          record={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}

      {plan && <PlanQuotasModal plan={plan} onCancel={() => setPlan(undefined)} />}
    </>
  );
}
