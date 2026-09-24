import { Button, Card, Space, Tag } from "@arco-design/web-react";
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
  if (status === "running") return "info";
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
    queryFn: fetchPlatformComponents,
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
      width: 90,
      render: (_, component) => (
        <StatusBadge
          value={component.status}
          tone={componentStatusTone(component.status)}
          processing={component.status === "running"}
        />
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
      width: 160,
      ellipsis: true,
      render: (_, component) => component.version || "-",
    },
    {
      title: "就绪副本",
      width: 80,
      ellipsis: true,
      render: (_, component) => `${component.readyReplicas} / ${component.desiredReplicas}`,
    },
    {
      title: "资源类型",
      width: 130,
      ellipsis: true,
      render: (_, component) => component.kind || "-",
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
              onClick={() => void componentsQuery.refetch()}
            >
              刷新
            </Button>
          </Space>
        ),
      }}
    >
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
            description: "故障和降级组件优先展示；本页只读，不提供重启或扩缩容操作。",
            extra: <span className="text-xs text-gray-500">共 {total} 个组件</span>,
          }}
          rowKey={(component) => `${component.group}:${component.namespace}:${component.name}`}
          columns={columns}
          rowActions={[
            {
              key: "logs",
              label: "查看日志",
              onClick: (component) =>
                void navigate({
                  to: "/logs",
                  search: { component: component.name },
                }),
            },
          ]}
          data={[...components].sort((left, right) => {
            const rank: Record<string, number> = { stopped: 0, degraded: 1, running: 3 };
            return (rank[left.status] ?? 2) - (rank[right.status] ?? 2);
          })}
          loading={componentsQuery.isPending}
          pagination="client"
          scroll={{ x: 1190 }}
          noDataElement="暂无组件状态数据"
        />
      </Card>
    </ResourcePageFrame>
  );
}
