import { fetchGpuInventory, gpuResourcePoolQueryKeys } from "@/api/gpu-inventory";
import { useQuery } from "@tanstack/react-query";

import { GpuDeviceTable } from "../../GpuDeviceTable";

export function GpuDeviceList() {
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

  const inventory = inventoryQuery.data;

  return (
    <div className="flex min-h-85 flex-col">
      <GpuDeviceTable data={inventory?.items || []} loading={inventoryQuery.isPending} />
    </div>
  );
}
