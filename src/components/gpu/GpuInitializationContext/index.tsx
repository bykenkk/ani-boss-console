import { IconApps } from "@arco-design/web-react/icon";
import type { GpuCluster } from "@/api/accelerator";
import { StatusBadge } from "@/components/common";

export function GpuInitializationContext({
  cluster,
  connected,
}: {
  cluster: GpuCluster;
  connected?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-(--color-fill-1) px-4 py-3 text-xs">
      <IconApps className="text-(--color-text-3)" />
      <span className="text-(--color-text-3)">目标集群</span>
      <span className="font-medium">{cluster.display_name}</span>
      <span className="break-all text-(--color-text-3) sm:border-l sm:border-(--color-border-2) sm:pl-3">
        {cluster.connection_ref}
      </span>
      {connected ? <StatusBadge className="sm:ml-auto" value="已连接" tone="success" /> : null}
    </div>
  );
}
