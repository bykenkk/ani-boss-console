import { useMemo, useState } from "react";
import { DatePicker, Input, Select, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  auditLogKeys,
  listAuditLogs,
  type AuditLogFilters,
  type AuditLogKind,
} from "@/api/audit-logs";
import { ListDataTable, ListPageFrame } from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { getRecentDateTimeRange, toRfc3339DateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { AuditLogDetailDrawer } from "../AuditLogDetailDrawer";
import { getAuditColumns } from "./model";
import { auditTitles, loginStatusLabels } from "./constants";

interface AuditLogsListProps {
  kind: AuditLogKind;
}

export function AuditLogsList({ kind }: AuditLogsListProps) {
  const [usernameDraft, setUsernameDraft] = useState("");
  const [username, setUsername] = useState("");
  const [ipAddressDraft, setIpAddressDraft] = useState("");
  const [ipAddress, setIpAddress] = useState("");
  const [result, setResult] = useState("all");
  const [timeRange, setTimeRange] = useState<string[]>(getRecentDateTimeRange);
  const [detailId, setDetailId] = useState<number>();
  const filters: AuditLogFilters = {
    username__icontains: username || undefined,
    ip_address: ipAddress || undefined,
    created_at__gte: toRfc3339DateTime(timeRange[0] ?? "") || undefined,
    created_at__lte: toRfc3339DateTime(timeRange[1] ?? "") || undefined,
    ...(kind === "login"
      ? { status: result === "all" ? undefined : (result as AuditLogFilters["status"]) }
      : { success: result === "all" ? undefined : result === "success" }),
  };
  const pagination = useListPagination(JSON.stringify({ kind, filters }));
  const params = { page: pagination.page, pageSize: pagination.pageSize, filters };
  const query = useQuery({
    queryKey: auditLogKeys.list(kind, params),
    queryFn: ({ signal }) => listAuditLogs(kind, params, signal),
    meta: {
      errorNotification: { id: withId("audit-logs", kind), action: `${auditTitles[kind]}加载` },
    },
  });
  const columns = useMemo(() => getAuditColumns(kind), [kind]);
  const resultOptions =
    kind === "login"
      ? Object.entries(loginStatusLabels).map(([value, label]) => ({ value, label }))
      : [
          { value: "success", label: "成功" },
          { value: "failed", label: "失败" },
        ];

  return (
    <ListPageFrame
      header={{ title: auditTitles[kind], subtitle: "平台侧只读审计，按创建时间倒序展示。" }}
      toolbar={{
        filters: (
          <Space>
            <Input.Search
              aria-label="用户名模糊匹配"
              placeholder="用户名"
              allowClear
              value={usernameDraft}
              onChange={(value) => {
                setUsernameDraft(value);
                if (!value) setUsername("");
              }}
              onSearch={(value) => setUsername(value.trim())}
            />
            <Select
              aria-label="日志状态"
              value={result}
              onChange={setResult}
              options={[{ value: "all", label: "全部状态" }, ...resultOptions]}
            />
            <Input.Search
              aria-label="IP 地址精确匹配"
              placeholder="IP 地址"
              allowClear
              value={ipAddressDraft}
              onChange={(value) => {
                setIpAddressDraft(value);
                if (!value) setIpAddress("");
              }}
              onSearch={(value) => setIpAddress(value.trim())}
            />
            <DatePicker.RangePicker
              aria-label="审计时间范围"
              showTime
              format="YYYY-MM-DD HH:mm:ss"
              value={timeRange}
              onChange={(value) => setTimeRange(value ?? [])}
            />
          </Space>
        ),
        refresh: {
          spinning: query.isFetching,
          onClick: () => {
            query.refetch();
          },
        },
      }}
    >
      <ListDataTable
        rowKey="id"
        columns={columns}
        data={query.data?.items ?? []}
        loading={query.isFetching}
        tableLabel={auditTitles[kind]}
        emptyText="暂无审计记录"
        rowActions={[
          {
            key: "detail",
            label: "查看",
            disabled: (item) => item.id === undefined,
            onClick: (item) => setDetailId(item.id),
          },
        ]}
        pagination={{
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: Number(query.data?.total ?? "0"),
          pageSizeOptions: [20, 50, 100],
          disabled: query.isFetching,
          onPageChange: pagination.setPage,
          onPageSizeChange: pagination.setPageSize,
        }}
      />
      {detailId !== undefined && (
        <AuditLogDetailDrawer kind={kind} id={detailId} onClose={() => setDetailId(undefined)} />
      )}
    </ListPageFrame>
  );
}
