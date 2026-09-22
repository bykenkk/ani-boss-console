import { Button, Tooltip } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import clsx from "clsx";
import { fetchPlatformComponents, platformQueryKeys, type PlatformComponent } from "@/api/platform";
import {
  DataTableNameCell,
  ListDataTable,
  ListPageHeader,
  StatusBadge,
  TableSectionFrame,
  type ListColumn,
  type StatusBadgeTone,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { formatDateTime } from "@/lib/date";

const groupNames: Record<string, string> = {
  service: "核心服务",
  dependency: "基础依赖",
  platform: "平台组件",
};

function componentStatusTone(status: string): StatusBadgeTone {
  if (status === "running") return "info";
  if (status === "degraded") return "warning";
  return "default";
}

function ScrapeBadge({ component }: { component: PlatformComponent }) {
  const { reason, scrapeStatus } = component;
  const tone: StatusBadgeTone =
    scrapeStatus === "reachable"
      ? "success"
      : scrapeStatus === "unknown"
        ? "warning"
        : scrapeStatus === "unreachable"
          ? "danger"
          : "default";
  const badge = <StatusBadge value={scrapeStatus} tone={tone} />;

  return reason ? (
    <Tooltip content={reason}>
      <span>{badge}</span>
    </Tooltip>
  ) : (
    badge
  );
}

function formatObservedAt(value?: string) {
  return formatDateTime(value, value || "-");
}

export function PlatformHealthPage() {
  const navigate = useNavigate();
  const componentsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-components",
        action: "平台组件状态加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformQueryKeys.components,
    queryFn: fetchPlatformComponents,
  });

  const groups = componentsQuery.data?.groups || [];
  const components = groups.flatMap((group) => group.components);
  const runningCount = components.filter((item) => item.status === "running").length;
  const degradedCount = components.filter((item) => item.status === "degraded").length;
  const stoppedCount = components.filter((item) => item.status === "stopped").length;
  const otherCount = components.length - runningCount - degradedCount - stoppedCount;
  const total = components.length;
  const overall =
    componentsQuery.isPending || !componentsQuery.data
      ? "加载中"
      : total === 0
        ? "-"
        : stoppedCount > 0
          ? "存在停止"
          : degradedCount > 0 || otherCount > 0
            ? "部分降级"
            : "正常";
  const overallTone =
    stoppedCount > 0 ? "danger" : degradedCount > 0 || otherCount > 0 ? "warning" : undefined;

  const columns: ListColumn<PlatformComponent>[] = [
    {
      title: "分组",
      width: 110,
      render: (_, component) => groupNames[component.group] || component.group || "-",
    },
    {
      title: "组件",
      width: 240,
      fixed: "left",
      render: (_, component) => (
        <DataTableNameCell name={component.name} id={component.namespace || "-"} />
      ),
    },
    {
      title: "状态",
      width: 90,
      render: (_, component) => (
        <StatusBadge value={component.status} tone={componentStatusTone(component.status)} />
      ),
    },
    {
      title: "版本",
      width: 160,
      render: (_, component) => component.version || "-",
    },
    {
      title: "就绪副本",
      width: 110,
      render: (_, component) => `${component.readyReplicas} / ${component.desiredReplicas}`,
    },
    {
      title: "资源类型",
      width: 130,
      render: (_, component) => component.kind || "-",
    },
    {
      title: "观测状态",
      width: 110,
      render: (_, component) => <ScrapeBadge component={component} />,
    },
  ];

  const distribution = [
    ["运行中", runningCount, "bg-green-500"],
    ["降级", degradedCount, "bg-orange-500"],
    ["已停止", stoppedCount, "bg-gray-500"],
  ] as const;

  return (
    <div className="flex min-h-(--app-content-available-height) flex-col gap-4">
      <ListPageHeader
        title="平台健康"
        subtitle="查看 ANI 服务、基础依赖和平台组件的实时运行状态。"
        extra={
          <Button
            loading={componentsQuery.isFetching}
            onClick={() => void componentsQuery.refetch()}
          >
            刷新
          </Button>
        }
      />
      <section className="grid grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2">
        <Metric label="整体状态" value={overall} hint={`${total} 个组件`} tone={overallTone} />
        <Metric
          label="运行中"
          value={componentsQuery.data ? String(runningCount) : "-"}
          hint="副本已全部就绪"
        />
        <Metric
          label="降级"
          value={componentsQuery.data ? String(degradedCount) : "-"}
          hint="部分副本未就绪"
          tone="warning"
        />
        <Metric
          label="已停止"
          value={componentsQuery.data ? String(stoppedCount) : "-"}
          hint="期望副本为 0"
          tone="danger"
        />
      </section>

      <section className="grid grid-cols-2 gap-3.5 max-[980px]:grid-cols-1">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-900">组件状态分布</div>
          <div className="mt-5 space-y-4">
            {distribution.map(([label, count, color]) => (
              <div
                key={label}
                className="grid grid-cols-[56px_1fr_32px] items-center gap-3 text-sm"
              >
                <span>{label}</span>
                <div className="h-2 rounded bg-gray-100">
                  <div
                    className={clsx("h-2 rounded", color)}
                    style={{ width: `${total === 0 ? 0 : (count / total) * 100}%` }}
                  />
                </div>
                <span className="text-right text-gray-500">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="text-base font-semibold text-gray-900">组件范围</div>
          <dl className="mt-4 grid grid-cols-[96px_1fr] gap-x-4 gap-y-3 text-sm">
            {groups.map((group) => (
              <div key={group.name} className="contents">
                <dt className="text-gray-500">{groupNames[group.name] || group.name}</dt>
                <dd className="m-0 text-gray-900">{group.components.length} 个</dd>
              </div>
            ))}
            <dt className="text-gray-500">观测时间</dt>
            <dd className="m-0 text-gray-900">
              {formatObservedAt(componentsQuery.data?.observedAt)}
            </dd>
          </dl>
        </div>
      </section>

      <TableSectionFrame>
        <ListDataTable
          header={{
            title: (
              <span className="flex flex-col gap-1">
                <span className="text-base font-semibold text-gray-900">组件健康明细</span>
                <span className="text-xs font-normal text-gray-500">
                  故障和降级组件优先展示；本页只读，不提供重启或扩缩容操作。
                </span>
              </span>
            ),
            extra: <span className="text-xs text-gray-500">共 {total} 个组件</span>,
            className: "mb-3 pt-5",
          }}
          rowKey={(component) => `${component.group}:${component.namespace}:${component.name}`}
          columns={columns}
          rowActions={[
            {
              key: "logs",
              label: "查看日志",
              onClick: (component) =>
                void navigate({
                  to: "/health-logs",
                  search: { component: component.name },
                }),
            },
          ]}
          data={[...components].sort((left, right) => {
            const rank: Record<string, number> = { stopped: 0, degraded: 1, running: 3 };
            return (rank[left.status] ?? 2) - (rank[right.status] ?? 2);
          })}
          loading={componentsQuery.isPending}
          pagination={false}
          scroll={{ x: 1190 }}
          emptyText="暂无组件状态数据"
        />
      </TableSectionFrame>
    </div>
  );
}
