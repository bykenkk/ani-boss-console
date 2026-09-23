import { Button } from "@arco-design/web-react";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import {
  gpuResourcePoolQueryKeys,
  type GpuInventoryDevice,
  type GpuPartitionTask,
} from "@/api/gpu-inventory";
import { GpuClusterPartitionModal } from "../GpuClusterPartitionModal";

interface GpuClusterPartitionFlowProps {
  devices: GpuInventoryDevice[];
}

export function GpuClusterPartitionFlow({ devices }: GpuClusterPartitionFlowProps) {
  const queryClient = useQueryClient();
  const [partitionVisible, setPartitionVisible] = useState(false);

  const refreshInventory = useCallback(
    async (_task: GpuPartitionTask) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: gpuResourcePoolQueryKeys.inventory }),
        queryClient.invalidateQueries({ queryKey: gpuResourcePoolQueryKeys.occupancy }),
      ]);
    },
    [queryClient],
  );

  return (
    <>
      <Button type="primary" onClick={() => setPartitionVisible(true)}>
        集群切分配置
      </Button>

      {partitionVisible ? (
        <GpuClusterPartitionModal
          devices={devices}
          onCancel={() => setPartitionVisible(false)}
          onTaskCompleted={refreshInventory}
        />
      ) : null}
    </>
  );
}
