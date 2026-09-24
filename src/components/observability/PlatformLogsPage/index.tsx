import { SummaryStrip } from "@/components/common";
import { Button, Input, Select, Space } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
import {
  usePlatformComponentLogs,
  type LogConnectionState,
} from "@/hooks/usePlatformComponentLogs";

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

  const nestedLevel = typeof nested?.level === "string" ? nested.level.toLowerCase() : undefined;
  const displayLevel =
    nestedLevel && levelMeta[nestedLevel] ? nestedLevel : log.level.toLowerCase();
  const nestedMessage = typeof nested?.msg === "string" ? nested.msg : undefined;
  const nestedError = typeof nested?.err === "string" ? nested.err : undefined;
  const displayMessage = [nestedMessage || log.message, nestedError].filter(Boolean).join(" · ");
  const requestIdValue = nested?.request_id ?? nested?.requestId ?? nested?.requestID;

  return {
    ...log,
    id: [log.timestamp, log.pod, log.container, log.stream, log.message].join("\u0000"),
    displayLevel,
    displayMessage,
    requestId: typeof requestIdValue === "string" ? requestIdValue : "-",
  };
}

function formatTimestamp(value: string) {
  return formatDateTime(value, value || "-");
}

export function PlatformLogsPage({ initialComponent }: PlatformLogsPageProps) {
  const [componentOverride, setComponentOverride] = useState<string>();
  const [level, setLevel] = useState("all");
  const [keyword, setKeyword] = useState("");
  const componentsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-components",
        action: "平台组件列表加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformQueryKeys.components,
    queryFn: fetchPlatformComponents,
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

  const component = componentOverride ?? initialComponent ?? componentOptions[0]?.value ?? "";

  const stream = usePlatformComponentLogs(component);

  const displayLogs = useMemo(() => stream.logs.map(parseLog).reverse(), [stream.logs]);
  const filteredLogs = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return displayLogs.filter((log) => {
      const matchesKeyword =
        !query ||
        `${log.displayMessage} ${log.requestId} ${log.pod} ${log.container}`
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
          <span className={`inline-flex rounded px-2 py-0.5 text-xs ${meta.className}`}>
            {meta.label}
          </span>
        );
      },
    },
    {
      title: "Pod / 容器",
      width: 240,
      render: (_, log) => <ResourceNameId name={log.pod || "-"} id={log.container || "-"} />,
    },
    {
      title: "输出流",
      dataIndex: "stream",
      width: 90,
      render: (value) => String(value || "-"),
    },
    {
      title: "request_id",
      dataIndex: "requestId",
      width: 190,
      ellipsis: true,
      render: (value) => <code className="text-xs">{String(value || "-")}</code>,
    },
    { title: "摘要", dataIndex: "displayMessage", width: 520, ellipsis: true },
  ];
  const connection = connectionMeta[stream.connectionState];

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
            <Button disabled={!component} onClick={stream.restart}>
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
              onChange={setComponentOverride}
              placeholder="选择组件"
              options={componentOptions}
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
              ]}
            />
            <Input.Search
              allowClear
              value={keyword}
              onChange={setKeyword}
              placeholder="搜索 request_id、Pod、容器或摘要"
            />
          </Space>
        ),
        actions: (
          <Button disabled={stream.logs.length === 0} onClick={stream.clear}>
            清空
          </Button>
        ),
        tools: <span className="text-xs text-gray-500">显示 {filteredLogs.length} 条</span>,
      }}
    >
      <ListDataTable
        rowKey="id"
        columns={columns}
        data={filteredLogs}
        pagination="client"
        scroll={{ x: 1310 }}
        emptyText={component ? "暂无组件日志" : "请选择组件查看实时日志"}
      />
    </ListPageFrame>
  );
}
