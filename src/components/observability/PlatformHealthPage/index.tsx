import { Button, Card, Space, Tag, Tooltip } from "@arco-design/web-react";
import { IconClockCircle, IconRefresh } from "@arco-design/web-react/icon";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { fetchPlatformComponents, platformQueryKeys, type PlatformComponent } from "@/api/platform";
import {
  ResourceNameId,
  DataTable,
  ResourcePageFrame,
  StatusBadge,
  type ListColumn,
  type StatusBadgeTone,
} from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { ComponentScope } from "./ComponentScope";
import { HealthDistribution } from "./HealthDistribution";
import { HealthSummary } from "./HealthSummary";
import { groupColors, groupNames, summarizeComponentHealth } from "./model";

function componentStatusTone(status: string): StatusBadgeTone {
  if (status === "running") return "success";
  if (status === "degraded") return "warning";
  return "default";
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
    queryFn: ({ signal }) => fetchPlatformComponents(signal),
    refetchInterval: 10_000,
  });

  const groups = componentsQuery.data?.groups || [];
  const components = groups.flatMap((group) => group.components);
  const total = components.length;
  const summary = summarizeComponentHealth(components);
  const hasData = Boolean(componentsQuery.data);

  const columns: ListColumn<PlatformComponent>[] = [
    {
      title: "组件",
      width: 200,
      fixed: "left",
      render: (_, component) => (
        <ResourceNameId name={component.name} id={component.namespace || "-"} />
      ),
    },
    {
      title: "状态",
      width: 120,
      render: (_, component) => (
        <Tooltip content={component.reason || component.status}>
          <span>
            <StatusBadge
              value={component.status === "unknown" ? "观测异常" : component.status}
              tone={componentStatusTone(component.status)}
            />
          </span>
        </Tooltip>
      ),
    },
    {
      title: "分组",
      width: 110,
      render: (_, component) =>
        component.group ? (
          <Tag color="gray" style={groupColors[component.group]}>
            {groupNames[component.group] || component.group}
          </Tag>
        ) : (
          "-"
        ),
    },
    {
      title: "版本",
      dataIndex: "version",
      width: 160,
      ellipsis: true,
    },
    {
      title: "就绪副本",
      width: 80,
      ellipsis: true,
      render: (_, component) =>
        `${component.readyReplicas ?? "-"} / ${component.desiredReplicas ?? "-"}`,
    },
    {
      title: "资源类型",
      dataIndex: "kind",
      width: 130,
      ellipsis: true,
    },
    {
      title: "指标抓取",
      width: 160,
      render: (_, component) =>
        component.group === "service" && component.scrapeStatus ? (
          <Tooltip content="仅表示指标抓取是否可达，不代表组件运行状态">
            <span>
              <StatusBadge
                value={
                  { reachable: "指标可达", unreachable: "指标不可达", unknown: "暂无观测数据" }[
                    component.scrapeStatus
                  ]
                }
                tone={
                  component.scrapeStatus === "reachable"
                    ? "success"
                    : component.scrapeStatus === "unreachable"
                      ? "warning"
                      : "default"
                }
              />
            </span>
          </Tooltip>
        ) : (
          "-"
        ),
    },
  ];

  return (
    <ResourcePageFrame
      className="h-auto! min-h-(--app-content-available-height)!"
      header={{
        title: "平台健康",
        subtitle: "查看 ANI 服务、基础依赖和平台组件的实时运行状态。",
        extra: (
          <Space wrap size={12}>
            <span className="inline-flex items-center gap-1.5 text-xs text-(--color-text-3)">
              <IconClockCircle />
              观测时间 {formatObservedAt(componentsQuery.data?.observedAt)}
            </span>
            <Button
              icon={<IconRefresh />}
              loading={componentsQuery.isFetching}
              onClick={() => componentsQuery.refetch()}
            >
              刷新
            </Button>
          </Space>
        ),
      }}
    >
      {componentsQuery.data?.profile.realProvider === false ? (
        <div role="status" className="text-sm text-(--color-text-2)">
          部分组件观测异常，数据可能不完整。
          {componentsQuery.data.profile.reason ? (
            <span> {componentsQuery.data.profile.reason}</span>
          ) : null}
        </div>
      ) : null}
      <HealthSummary summary={summary} hasData={hasData} pending={componentsQuery.isPending} />

      <section className="grid grid-cols-[1.5fr_1fr] gap-4 max-[980px]:grid-cols-1">
        <HealthDistribution
          summary={summary}
          hasData={hasData}
          pending={componentsQuery.isPending}
        />
        <ComponentScope groups={groups} pending={componentsQuery.isPending} />
      </section>

      <Card>
        <DataTable
          header={{
            title: "组件健康明细",
            description: "按服务、依赖和平台分组顺序展示，每 10 秒刷新；本页只读。",
            extra: <span className="text-xs text-gray-500">共 {total} 个组件</span>,
          }}
          rowKey={(component) => `${component.group}:${component.namespace}:${component.name}`}
          columns={columns}
          rowActions={[
            {
              key: "logs",
              label: "查看日志",
              onClick: (component) =>
                navigate({
                  to: "/logs",
                  search: { component: component.name },
                }),
            },
          ]}
          data={components}
          loading={componentsQuery.isPending}
          pagination={false}
          scroll={{ x: 1350 }}
          noDataElement="暂无组件状态数据"
        />
      </Card>
    </ResourcePageFrame>
  );
}
