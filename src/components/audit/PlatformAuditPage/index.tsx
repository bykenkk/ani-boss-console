import { Button, DatePicker, Input, Select, Space } from "@arco-design/web-react";
import { IconDownload } from "@arco-design/web-react/icon";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  fetchPlatformAuditLogs,
  platformAuditQueryKeys,
  type PlatformAuditLogItem,
  type PlatformAuditLogQuery,
  type PlatformAuditVerb,
} from "@/api/audit";
import { ListDataTable, ListPageFrame } from "@/components/common";
import { getRecentDateTimeRange, toRfc3339DateTime } from "@/lib/date";
import { showMessage } from "@/lib/feedback";
import { PlatformAuditDetailDrawer } from "./PlatformAuditDetailDrawer";
import { auditVerbOptions, downloadPlatformAuditCsv, getPlatformAuditColumns } from "./model";

const DEFAULT_PAGE_SIZE = 20;

export function PlatformAuditPage() {
  const [keywordDraft, setKeywordDraft] = useState("");
  const [keyword, setKeyword] = useState("");
  const [verb, setVerb] = useState<PlatformAuditVerb | "all">("all");
  const [timeRange, setTimeRange] = useState<[string, string]>(getRecentDateTimeRange);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(0);
  const [cursors, setCursors] = useState([""]);
  const [detailItem, setDetailItem] = useState<PlatformAuditLogItem>();

  const resetPagination = () => {
    setPage(0);
    setCursors([""]);
  };

  const queryParams = useMemo<PlatformAuditLogQuery | undefined>(() => {
    const timeFrom = toRfc3339DateTime(timeRange[0]);
    const timeTo = toRfc3339DateTime(timeRange[1]);
    if (!timeFrom || !timeTo) return undefined;
    return {
      timeFrom,
      timeTo,
      verb: verb === "all" ? undefined : verb,
      keyword: keyword || undefined,
      after: cursors[page] || undefined,
      pageSize,
    };
  }, [cursors, keyword, page, pageSize, timeRange, verb]);

  const auditQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-audit-logs",
        action: "平台审计日志加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformAuditQueryKeys.list(queryParams || { timeFrom: "", timeTo: "", pageSize }),
    queryFn: () => {
      if (!queryParams) throw new Error("请选择有效的时间范围");
      return fetchPlatformAuditLogs(queryParams);
    },
    enabled: Boolean(queryParams),
    placeholderData: page > 0 ? keepPreviousData : undefined,
    staleTime: 30_000,
  });

  const items = auditQuery.data?.items || [];
  const columns = useMemo(() => getPlatformAuditColumns(), []);
  const canGoNext = !auditQuery.isPlaceholderData && Boolean(auditQuery.data?.nextAfter);
  const reachableTotal = page * pageSize + Math.max(items.length, 1) + (canGoNext ? 1 : 0);

  const applyKeyword = (value: string) => {
    setKeyword(value.trim());
    resetPagination();
  };

  const goToNextPage = () => {
    const nextAfter = auditQuery.data?.nextAfter;
    if (!nextAfter) return;
    setCursors((current) => [...current.slice(0, page + 1), nextAfter]);
    setPage((current) => current + 1);
  };

  const changePage = (nextPage: number) => {
    const nextIndex = nextPage - 1;
    if (nextIndex === page + 1) {
      goToNextPage();
      return;
    }
    if (nextIndex >= 0 && nextIndex < cursors.length) setPage(nextIndex);
  };

  const exportCurrentPage = () => {
    if (!items.length) return;
    downloadPlatformAuditCsv(items);
    showMessage({ type: "success", content: `已导出当前页 ${items.length} 条审计记录` });
  };

  return (
    <ListPageFrame
      header={{
        title: "集群审计",
        subtitle: "查询 Kubernetes 控制面写操作；数据按时间倒序展示。",
        extra: (
          <Button
            type="primary"
            icon={<IconDownload />}
            disabled={!items.length || auditQuery.isPlaceholderData}
            onClick={exportCurrentPage}
          >
            导出当前页
          </Button>
        ),
      }}
      toolbar={{
        filters: (
          <Space>
            <Input.Search
              allowClear
              value={keywordDraft}
              placeholder="搜索操作者 / 动作 / 资源"
              onChange={setKeywordDraft}
              onSearch={applyKeyword}
            />
            <Select
              value={verb}
              options={auditVerbOptions}
              onChange={(value) => {
                setVerb(value as PlatformAuditVerb | "all");
                resetPagination();
              }}
            />
            <DatePicker.RangePicker
              showTime
              allowClear={false}
              format="YYYY-MM-DD HH:mm:ss"
              value={timeRange}
              onChange={(value) => {
                if (value.length !== 2) return;
                setTimeRange([value[0], value[1]]);
                resetPagination();
              }}
            />
          </Space>
        ),
        refresh: {
          spinning: auditQuery.isFetching,
          onClick: () => void auditQuery.refetch(),
        },
      }}
    >
      <div className="flex min-h-0 flex-1 flex-col">
        <ListDataTable
          rowKey="auditId"
          columns={columns}
          rowActions={[
            {
              key: "view",
              label: "查看",
              onClick: setDetailItem,
            },
          ]}
          data={items}
          loading={auditQuery.isPending || auditQuery.isFetching}
          pagination={{
            page: page + 1,
            pageSize,
            total: reachableTotal,
            pageSizeOptions: [20, 50, 100],
            onPageChange: changePage,
            onPageSizeChange: (value) => {
              setPageSize(value);
              resetPagination();
            },
          }}
          tableLabel="平台审计日志"
          emptyText="暂无审计记录"
        />
      </div>

      <PlatformAuditDetailDrawer item={detailItem} onClose={() => setDetailItem(undefined)} />
    </ListPageFrame>
  );
}
