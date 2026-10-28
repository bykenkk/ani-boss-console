import { Card, Empty } from "@arco-design/web-react";
import { formatGpuAmount, type ModelGpuCapacity } from "../gpu-capacity";

interface PlatformCapacitySummaryProps {
  models: ModelGpuCapacity[];
  loading: boolean;
}

export function PlatformCapacitySummary({ models, loading }: PlatformCapacitySummaryProps) {
  return (
    <Card className="h-full">
      <h3 className="m-0 mb-3 text-base font-semibold">GPU 资源容量</h3>
      <p className="mb-4 text-xs text-[var(--color-text-3)]">
        按集群、型号统计，展示未分配 / 总量。
      </p>
      {models.length ? (
        <div className="flex max-h-96 flex-col gap-4 overflow-auto">
          {models.map((model) => (
            <section
              key={model.key}
              className="border-b border-[var(--color-border-2)] pb-3 last:border-0"
            >
              <div className="font-medium">{model.clusterName}</div>
              <div className="my-1 break-words text-xs text-[var(--color-text-3)]">
                {model.modelKey}
              </div>
              <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-xs">
                <dt>整卡</dt>
                <dd className="m-0 text-right">
                  {formatGpuAmount(model.wholeFree)} / {formatGpuAmount(model.wholeTotal)} 张未分配
                </dd>
                <dt>共享显存</dt>
                <dd className="m-0 text-right">
                  {formatGpuAmount(
                    model.sharedFreeMiB === undefined ? undefined : model.sharedFreeMiB / 1024,
                  )}{" "}
                  /{" "}
                  {formatGpuAmount(
                    model.sharedTotalMiB === undefined ? undefined : model.sharedTotalMiB / 1024,
                  )}{" "}
                  GiB 未分配
                </dd>
              </dl>
              {model.closedGroups > 0 ? (
                <div className="mt-2 text-xs text-[var(--color-text-3)]">
                  {model.closedGroups} 个供给组已关闭接单
                </div>
              ) : null}
            </section>
          ))}
        </div>
      ) : loading ? (
        <div className="py-10 text-center text-[var(--color-text-3)]">正在加载 GPU 容量…</div>
      ) : (
        <Empty description="暂无 GPU 容量数据" />
      )}
      <p className="mb-0 mt-4 text-xs text-[var(--color-text-3)]">
        未分配容量仍受接单状态、单卡余量及切片槽位限制。
      </p>
    </Card>
  );
}
