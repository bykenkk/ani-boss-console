import { SummaryStrip } from "@/components/common";
import { Button, Input, Select, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  fetchPlatformComponents,
  platformQueryKeys,
  type PlatformComponentLog,
} from "@/api/platform";
import {
  ResourceNameId,
  ListDataTable,
  ListPageFrame,
  type ListColumn,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { usePlatformComponentLogs } from "@/hooks/usePlatformComponentLogs";
import { getLogIdentity, type LogConnectionState } from "./log-stream";
import { PlatformLogRawDrawer } from "./PlatformLogRawDrawer";

interface PlatformLogsPageProps {
  initialComponent?: string;
}

interface DisplayLog extends PlatformComponentLog {
  id: string;
  displayLevel: string;
  displayMessage: string;
  requestId: string;
}

const levelMeta: Record<string, { label: string; className: string }> = {
  error: { label: "error", className: "bg-red-50 text-red-700" },
  warn: { label: "warn", className: "bg-orange-50 text-orange-700" },
  info: { label: "info", className: "bg-blue-50 text-blue-700" },
  debug: { label: "debug", className: "bg-gray-100 text-gray-600" },
  unknown: { label: "unknown", className: "bg-gray-100 text-gray-600" },
};

const connectionMeta: Record<LogConnectionState, { label: string; tone: StatusBadgeTone }> = {
  idle: { label: "等待选择组件", tone: "default" },
  connecting: { label: "正在连接", tone: "info" },
  connected: { label: "实时", tone: "success" },
  reconnecting: { label: "正在重连", tone: "warning" },
  failed: { label: "连接失败", tone: "danger" },
};

const groupNames: Record<string, string> = {
  service: "核心服务",
  dependency: "基础依赖",
  platform: "平台组件",
};

function parseLog(log: PlatformComponentLog): DisplayLog {
  let nested: Record<string, unknown> | undefined;
  try {
    const parsed = JSON.parse(log.message) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      nested = parsed as Record<string, unknown>;
    }
  } catch {
    nested = undefined;
  }

  const displayLevel = log.level.toLowerCase();
  const nestedMessage = typeof nested?.msg === "string" ? nested.msg : undefined;
  const nestedError = typeof nested?.err === "string" ? nested.err : undefined;
  const displayMessage = [nestedMessage || log.message, nestedError].filter(Boolean).join(" · ");
  const requestIdValue = nested?.request_id ?? nested?.requestId ?? nested?.requestID;

  return {
    ...log,
    id: getLogIdentity(log),
    displayLevel,
    displayMessage,
    requestId: typeof requestIdValue === "string" ? requestIdValue : "-",
  };
}

function formatTimestamp(value: string) {
  return formatDateTime(value, value || "-");
}

export function PlatformLogsPage({ initialComponent }: PlatformLogsPageProps) {
  const [selection, setSelection] = useState<{ initialComponent?: string; value: string }>();
  const [level, setLevel] = useState("all");
  const [keyword, setKeyword] = useState("");
  const [selectedLog, setSelectedLog] = useState<PlatformComponentLog>();
  const componentsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-components",
        action: "平台组件列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformQueryKeys.components,
    queryFn: ({ signal }) => fetchPlatformComponents(signal),
    refetchInterval: 10_000,
  });
  const componentOptions = useMemo(
    () =>
      (componentsQuery.data?.groups || []).flatMap((group) =>
        group.components.map((item) => ({
          label: `${groupNames[group.name] || group.name} · ${item.name}`,
          value: item.name,
        })),
      ),
    [componentsQuery.data],
  );

  const requestedComponent =
    (selection?.initialComponent === initialComponent ? selection?.value : undefined) ??
    initialComponent;
  const component = requestedComponent
    ? (componentOptions.find((option) => option.value === requestedComponent)?.value ?? "")
    : (componentOptions[0]?.value ?? "");
  const { logs, connectionState, restart, clear } = usePlatformComponentLogs(component);

  const displayLogs = useMemo(() => logs.map(parseLog).reverse(), [logs]);
  const filteredLogs = useMemo(() => {
    // TODO: 后端提供日志检索后迁移服务端筛选；目前仅检索当前内存窗口，不代表完整历史。
    const query = keyword.trim().toLowerCase();
    return displayLogs.filter((log) => {
      const matchesKeyword =
        !query ||
        `${log.message} ${log.displayMessage} ${log.requestId} ${log.pod} ${log.container}`
          .toLowerCase()
          .includes(query);
      return (level === "all" || log.displayLevel === level) && matchesKeyword;
    });
  }, [displayLogs, keyword, level]);

  const columns: ListColumn<DisplayLog>[] = [
    {
      title: "时间",
      width: 180,
      fixed: "left",
      render: (_, log) => formatTimestamp(log.timestamp),
    },
    {
      title: "级别",
      width: 90,
      render: (_, log) => {
        const meta = levelMeta[log.displayLevel] || {
          label: log.displayLevel || "-",
          className: "bg-gray-100 text-gray-600",
        };
        return (
          <span className={clsx("inline-flex rounded px-2 py-0.5 text-xs", meta.className)}>
            {meta.label}
          </span>
        );
      },
    },
    {
      title: "Pod / 容器",
      width: 200,
      render: (_, log) => <ResourceNameId name={log.pod || "-"} id={log.container || "-"} />,
    },
    {
      title: "输出流",
      dataIndex: "stream",
      width: 90,
      render: (value) => String(value || "-"),
    },
    { title: "日志原文", dataIndex: "message", width: 360, ellipsis: true },
  ];
  const connection = connectionMeta[connectionState];

  return (
    <ListPageFrame
      summary={
        <SummaryStrip
          pending={componentsQuery.isPending}
          items={[
            { label: "已接收日志", value: displayLogs.length, unit: "条", note: "当前组件缓冲区" },
            {
              label: "Info",
              value: displayLogs.filter((t) => t.displayLevel === "info").length,
              unit: "条",
            },
            {
              label: "Warn",
              value: displayLogs.filter((t) => t.displayLevel === "warn").length,
              unit: "条",
            },
            {
              label: "Error",
              value: displayLogs.filter((t) => t.displayLevel === "error").length,
              unit: "条",
            },
          ]}
        />
      }
      header={{
        title: "运行日志",
        subtitle: "按组件查看平台工作负载实时日志；流结束后页面会自动重连。",
        extra: (
          <div className="flex items-center gap-2">
            <StatusBadge value={connection.label} tone={connection.tone} />
            <Button disabled={!component} onClick={restart}>
              重新连接
            </Button>
          </div>
        ),
      }}
      toolbar={{
        filters: (
          <Space>
            <Select
              value={component || undefined}
              loading={componentsQuery.isPending}
              onChange={(value) => setSelection({ initialComponent, value })}
              placeholder="选择组件"
              options={componentOptions}
              filterOption={false}
            />
            <Select
              value={level}
              onChange={setLevel}
              options={[
                { label: "全部级别", value: "all" },
                { label: "error", value: "error" },
                { label: "warn", value: "warn" },
                { label: "info", value: "info" },
                { label: "debug", value: "debug" },
                { label: "unknown", value: "unknown" },
              ]}
            />
            <Input.Search
              allowClear
              value={keyword}
              onChange={setKeyword}
              placeholder="在当前窗口搜索 Pod、容器或日志"
            />
          </Space>
        ),
        actions: (
          <Button disabled={logs.length === 0} onClick={clear}>
            清空
          </Button>
        ),
        tools: (
          <span className="text-xs text-gray-500">
            当前窗口显示 {filteredLogs.length} 条 · 仅保留最近日志（最多 500 条）
          </span>
        ),
      }}
    >
      <ListDataTable
        rowKey="id"
        columns={columns}
        data={filteredLogs}
        pagination="client"
        rowActions={[
          { key: "view-raw-log", label: "查看日志原文", onClick: (log) => setSelectedLog(log) },
        ]}
        emptyText={component ? "暂无组件日志" : "请选择组件查看实时日志"}
      />
      {selectedLog && (
        <PlatformLogRawDrawer
          message={selectedLog.message}
          onClose={() => setSelectedLog(undefined)}
        />
      )}
    </ListPageFrame>
  );
}
