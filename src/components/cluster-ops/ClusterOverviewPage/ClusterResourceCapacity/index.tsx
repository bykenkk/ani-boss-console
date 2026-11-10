import type { ReactNode } from "react";
import { Card, Empty, Skeleton } from "@arco-design/web-react";
import { IconApps, IconArchive, IconCommon, IconStorage } from "@arco-design/web-react/icon";
import type { ClusterOpsClusterOverview } from "@/api/cluster-ops";
import { formatNodeQuantity } from "../../ClusterNodesPage/node-summary";

interface ClusterResourceCapacityProps {
  data?: ClusterOpsClusterOverview;
  showSkeleton: boolean;
}

const resourceDefinitions: Record<string, { label: string; icon: ReactNode }> = {
  cpu: { label: "CPU", icon: <IconCommon /> },
  memory: { label: "内存", icon: <IconStorage /> },
  "ephemeral-storage": { label: "临时存储", icon: <IconArchive /> },
  pods: { label: "Pod 容量", icon: <IconApps /> },
};

function formatCapacity(value: string | undefined, resource: string): ReactNode {
  if (value === undefined) return "-";
  let amount = value;
  let unit = "";
  if (resource === "cpu") {
    const formatted = formatNodeQuantity(value, "cpu");
    if (formatted === "-") return value;
    [amount, unit] = formatted.split(" ");
  } else if (resource === "memory" || resource === "ephemeral-storage") {
    const formatted = formatNodeQuantity(value, "memory");
    if (formatted === "-") return value;
    let size = Number(formatted.split(" ")[0]);
    const units = ["Gi", "Ti", "Pi", "Ei"];
    let index = 0;
    while (size >= 1024 && index < units.length - 1) {
      size /= 1024;
      index += 1;
    }
    amount = String(Number(size.toFixed(2)));
    unit = units[index];
  } else if (resource === "pods") {
    unit = "个";
  }
  const [integer, fraction] = amount.split(".");
  const groupedInteger = integer.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return (
    <>
      {fraction === undefined ? groupedInteger : `${groupedInteger}.${fraction}`}
      {unit ? <span className="ml-1 text-xs font-normal text-(--color-text-2)">{unit}</span> : null}
    </>
  );
}

export function ClusterResourceCapacity({ data, showSkeleton }: ClusterResourceCapacityProps) {
  const names = new Set([
    ...Object.keys(data?.capacity ?? {}),
    ...Object.keys(data?.allocatable ?? {}),
  ]);
  const resources = showSkeleton
    ? Object.keys(resourceDefinitions)
    : [
        ...Object.keys(resourceDefinitions).filter((name) => names.has(name)),
        ...Array.from(names).filter((name) => !Object.hasOwn(resourceDefinitions, name)),
      ];
  return (
    <section aria-label="节点资源容量" className="mt-2 flex flex-col gap-3">
      <h3 className="m-0 text-[15px] leading-normal font-medium">节点资源容量</h3>
      {resources.length ? (
        <div className="grid grid-cols-1 gap-4 @min-[421px]/overview:grid-cols-2">
          {resources.map((name) => (
            <Card key={name} className="min-w-0" bodyStyle={{ padding: 16 }}>
              <div className="flex items-center gap-2">
                <span aria-hidden className="flex shrink-0 text-base text-[rgb(var(--primary-6))]">
                  {resourceDefinitions[name]?.icon ?? <IconCommon />}
                </span>
                <h4 className="m-0 min-w-0 break-all text-sm font-medium">
                  {resourceDefinitions[name]?.label ?? name}
                </h4>
              </div>
              <dl aria-busy={showSkeleton} className="m-0 mt-5 grid grid-cols-2 gap-4">
                <div className="min-w-0">
                  <dt className="text-xs text-(--color-text-2)">总容量</dt>
                  <dd className="m-0 mt-1 break-all text-2xl leading-normal font-medium tabular-nums">
                    {showSkeleton ? (
                      <Skeleton
                        animation
                        className="py-1 [&_.arco-skeleton-text-row]:h-7!"
                        text={{ rows: 1, width: "70%" }}
                      />
                    ) : (
                      formatCapacity(data?.capacity[name], name)
                    )}
                  </dd>
                </div>
                <div className="min-w-0 border-0 border-l border-solid border-(--color-border-2) pl-5">
                  <dt className="text-xs text-(--color-text-2)">可分配</dt>
                  <dd className="m-0 mt-1 break-all text-2xl leading-normal font-medium tabular-nums">
                    {showSkeleton ? (
                      <Skeleton
                        animation
                        className="py-1 [&_.arco-skeleton-text-row]:h-7!"
                        text={{ rows: 1, width: "70%" }}
                      />
                    ) : (
                      formatCapacity(data?.allocatable[name], name)
                    )}
                  </dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      ) : (
        <Card bodyStyle={{ padding: 16 }}>
          <Empty />
        </Card>
      )}
    </section>
  );
}
