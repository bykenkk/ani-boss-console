import { Card, Skeleton, Statistic } from "@arco-design/web-react";
import { IconApps, IconCodeSandbox, IconFolder, IconStorage } from "@arco-design/web-react/icon";
import type { ClusterOpsClusterOverview } from "@/api/cluster-ops";

interface ClusterOverviewMetricsProps {
  data?: ClusterOpsClusterOverview;
  showSkeleton: boolean;
}

export function ClusterOverviewMetrics({ data, showSkeleton }: ClusterOverviewMetricsProps) {
  const metrics = [
    {
      label: "Kubernetes 版本",
      value: data?.kubernetes_version,
      caption: "当前集群版本",
      icon: <IconCodeSandbox />,
    },
    {
      label: "节点",
      value: data?.nodes_total,
      unit: "个",
      caption: (
        <>
          Ready
          <span className="ml-1 font-medium text-(--color-text-1)">
            {data ? `${data.nodes_ready} / ${data.nodes_total}` : "-"}
          </span>
        </>
      ),
      icon: <IconStorage />,
    },
    {
      label: "命名空间",
      value: data?.namespaces_total,
      unit: "个",
      caption: "Namespace 总数",
      icon: <IconFolder />,
    },
    {
      label: "Pod",
      value: data?.pods_total,
      unit: "个",
      caption: "当前 Pod 总数",
      icon: <IconApps />,
    },
  ];
  return (
    <section
      aria-label="集群关键指标"
      className="grid grid-cols-2 gap-4 @min-[601px]/overview:grid-cols-4"
    >
      {metrics.map((metric) => (
        <Card key={metric.label} className="min-w-0" bodyStyle={{ padding: 16 }}>
          <div className="flex items-center justify-between gap-1.5 text-xs leading-[18px] text-(--color-text-2)">
            <span>{metric.label}</span>
            <span aria-hidden className="flex shrink-0 text-base opacity-65">
              {metric.icon}
            </span>
          </div>
          {showSkeleton ? (
            <div aria-label={`${metric.label}加载中`} aria-busy="true">
              <Skeleton
                animation
                className="mt-2.5 mb-1 [&_.arco-skeleton-text-row]:h-7!"
                style={{ height: 37.5, alignItems: "center" }}
                text={{ rows: 1, width: "65%" }}
              />
              <Skeleton
                animation
                style={{ height: 18, alignItems: "center" }}
                text={{ rows: 1, width: "80%" }}
              />
            </div>
          ) : (
            <>
              <Statistic
                className="mt-2.5 mb-1 block!"
                value={metric.value ?? "-"}
                renderFormat={(value) => (
                  <span className="break-all tabular-nums">{String(value)}</span>
                )}
                suffix={
                  metric.value !== undefined && metric.unit ? (
                    <span className="text-xs font-normal text-(--color-text-3)">{metric.unit}</span>
                  ) : undefined
                }
                styleValue={{ fontSize: 25, fontWeight: 500, lineHeight: 1.5 }}
              />
              <div className="text-xs leading-[18px] text-(--color-text-2)">{metric.caption}</div>
            </>
          )}
        </Card>
      ))}
    </section>
  );
}
