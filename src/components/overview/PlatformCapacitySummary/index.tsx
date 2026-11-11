import { Card, Empty } from "@arco-design/web-react";
import {
  formatGpuAllocationType,
  formatGpuCapacityBasis,
  formatGpuCapacityGranularity,
} from "@/components/gpu/capacity";
import { formatGpuInteger, type ModelGpuCapacity } from "../gpu-capacity";

interface PlatformCapacitySummaryProps {
  models: ModelGpuCapacity[];
  loading: boolean;
}
export function PlatformCapacitySummary({ models, loading }: PlatformCapacitySummaryProps) {
  return (
    <Card className="h-full">
      <h3 className="m-0 mb-3 text-base font-semibold">GPU 资源容量</h3>
      <p className="mb-4 text-xs text-(--color-text-3)">
        按集群、型号和资源类型统计，同一供给组只计一次。展示未分配 / 总量。
      </p>
      {models.length ? (
        <div className="flex max-h-96 flex-col gap-4 overflow-auto">
          {models.map((model) => (
            <section
              key={model.key}
              className="border-b border-(--color-border-2) pb-3 last:border-0"
            >
              <div className="font-medium">{model.clusterName}</div>
              <div className="my-1 break-words text-xs text-(--color-text-3)">{model.modelKey}</div>
              {model.resources.length ? (
                model.resources.map((r) => {
                  const shared = r.allocation_type === "DYNAMIC_SHARED";
                  const free = shared
                    ? r.totals.unallocated_memory_mib
                    : r.totals.unallocated_units;
                  const total = shared ? r.totals.total_memory_mib : r.totals.total_units;
                  return (
                    <div
                      key={JSON.stringify([
                        r.allocation_type,
                        r.resource_key,
                        r.basis,
                        r.granularity,
                      ])}
                      className="mt-2 text-xs"
                    >
                      <div>
                        {formatGpuAllocationType(r.allocation_type)} · {r.resource_key}
                      </div>
                      <div className="my-1 text-(--color-text-3)">
                        {formatGpuCapacityBasis(r.basis)} ·{" "}
                        {formatGpuCapacityGranularity(r.granularity)}
                      </div>
                      <div className="text-right">
                        {formatGpuInteger(free)} / {formatGpuInteger(total)}{" "}
                        {shared ? "MiB" : "资源单位"} 未分配
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-xs">容量未知</div>
              )}
              {model.closedGroups > 0 ? (
                <div className="mt-2 text-xs text-(--color-text-3)">
                  {model.closedGroups} 个供给组已关闭接单
                </div>
              ) : null}
            </section>
          ))}
        </div>
      ) : loading ? (
        <div className="py-10 text-center text-(--color-text-3)">正在加载 GPU 容量…</div>
      ) : (
        <Empty description="暂无 GPU 容量数据" />
      )}
      <p className="mb-0 mt-4 text-xs text-(--color-text-3)">
        节点资源单位不等于物理卡数；未知值不计为零。容量观测不作为创建门槛。
      </p>
    </Card>
  );
}
