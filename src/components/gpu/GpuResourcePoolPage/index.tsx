import { useQuery } from "@tanstack/react-query";
import {
  fetchGpuInventory,
  fetchGpuOccupancy,
  gpuResourcePoolQueryKeys,
} from "@/api/gpu-inventory";
import { ResourcePageFrame } from "@/components/common";
import { GpuClusterPartitionFlow } from "../GpuClusterPartitionFlow";
import { GpuInventoryTable } from "../GpuInventoryTable";
import { GpuSummary } from "../GpuSummary";
import styles from "./index.module.less";

export function GpuResourcePoolPage() {
  const inventoryQuery = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-inventory",
        action: "GPU 设备库存加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.inventory,
    queryFn: fetchGpuInventory,
  });
  const occupancyQuery = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-occupancy",
        action: "GPU 占用汇总加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.occupancy,
    queryFn: fetchGpuOccupancy,
  });

  const inventory = inventoryQuery.data?.items || [];

  return (
    <ResourcePageFrame
      className={styles.page}
      header={{
        title: "GPU 资源池",
        subtitle: "查看 GPU 库存与租户配额，并在集群上统一配置空闲整卡的切分规则。",
        extra: <GpuClusterPartitionFlow devices={inventory} />,
      }}
    >
      <GpuSummary
        occupancy={occupancyQuery.data}
        occupancyPending={occupancyQuery.isPending || !occupancyQuery.data}
      />

      <div className={styles.inventory}>
        <GpuInventoryTable data={inventory} loading={inventoryQuery.isPending} />
      </div>
    </ResourcePageFrame>
  );
}
