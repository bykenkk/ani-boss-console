import { useQuery } from "@tanstack/react-query";
import { useCursorPagination } from "@/hooks/useCursorPagination";
import {
  fetchPlatformAdministratorAuditLogs,
  platformAdministratorQueryKeys,
} from "@/api/platform-admins";
import { withId } from "@/lib/id";
import type { PlatformAdministratorAuditLog } from "@/api/platform-admins";
import { DataTable, type ListColumn, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";

const actionLabels: Record<string, string> = {
  "platform_admin.create": "创建平台管理员",
  "platform_admin.change_role": "修改角色",
  "platform_admin.reset_password": "重置密码",
  "platform_admin.disable": "禁用账号",
  "platform_admin.enable": "启用账号",
  "platform_admin.delete": "删除账号",
};

const columns: ListColumn<PlatformAdministratorAuditLog>[] = [
  {
    title: "操作",
    dataIndex: "action",
    width: 180,
    render: (value) => actionLabels[value] ?? value,
  },
  { title: "资源", width: 240, dataIndex: "resource", render: (value) => value || "-" },
  {
    title: "结果",
    dataIndex: "result",
    width: 120,
    render: (value) => (
      <StatusBadge
        tone={value === "success" ? "success" : "danger"}
        value={value === "success" ? "成功" : "失败"}
      />
    ),
  },
  {
    title: "时间",
    dataIndex: "createdAt",
    width: 180,
    render: (value) => formatDateTime(value),
  },
];

interface OperationRecordsProps {
  userId: string;
}

export function OperationRecords({ userId }: OperationRecordsProps) {
  const cursor = useCursorPagination(userId);
  const pageParams = { cursor: cursor.cursor, limit: cursor.limit };
  const auditQuery = useQuery({
    queryKey: [...platformAdministratorQueryKeys.auditLogs(userId), pageParams],
    queryFn: ({ signal }) => fetchPlatformAdministratorAuditLogs(userId, pageParams, signal),
    meta: {
      errorNotification: {
        id: withId("platform-administrator-audit", userId),
        action: "账号操作记录加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  return (
    <DataTable
      rowKey="id"
      columns={columns}
      data={auditQuery.data?.items ?? []}
      loading={auditQuery.isPending}
      pagination={cursor.getPagination(
        auditQuery.data?.next_cursor ?? undefined,
        auditQuery.isFetching,
      )}
      scroll={{ x: 760 }}
    />
  );
}
