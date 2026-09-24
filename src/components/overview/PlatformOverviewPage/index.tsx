import { Button, Card, Tabs } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { fetchGpuOccupancy, gpuResourcePoolQueryKeys } from "@/api/gpu-inventory";
import { fetchPlatformCapacity, platformQueryKeys } from "@/api/platform";
import { ResourcePageFrame } from "@/components/common";
import { IconRefresh } from "@arco-design/web-react/icon";
import { PlatformCapacitySummary } from "../PlatformCapacitySummary";
import { ResourceUsageSummary } from "../ResourceUsageSummary";
import { GpuDeviceList } from "./GpuDeviceList";
import { GpuEventList } from "./GpuEventList";

export function PlatformOverviewPage() {
  const capacityQuery = useQuery({
    meta: {
      errorNotification: {
        id: "platform-capacity",
        action: "平台容量加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: platformQueryKeys.capacity,
    queryFn: fetchPlatformCapacity,
  });
  const occupancyQuery = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-occupancy",
        action: "GPU 资源池汇总加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.occupancy,
    queryFn: fetchGpuOccupancy,
  });
  const capacity = capacityQuery.data;
  const occupancy = occupancyQuery.data;

  return (
    <ResourcePageFrame
      className="h-auto! min-h-(--app-content-available-height)"
      header={{
        title: "平台概览",
        subtitle: "GPU 库存、租户与容量的一屏总览。当前数据用于资源运营观察。",
        extra: (
          <Button
            icon={<IconRefresh />}
            loading={capacityQuery.isFetching || occupancyQuery.isFetching}
            onClick={() => void Promise.all([capacityQuery.refetch(), occupancyQuery.refetch()])}
          >
            刷新
          </Button>
        ),
      }}
    >
      <section className="grid grid-cols-[minmax(0,2fr)_minmax(340px,1fr)] gap-4 max-[1100px]:grid-cols-1">
        <ResourceUsageSummary
          gpuTotal={capacity?.summary.gpuTotal}
          occupancy={occupancy}
          tenantCount={capacity?.summary.tenantCount}
          loading={capacityQuery.isPending || occupancyQuery.isPending}
        />
        <PlatformCapacitySummary region={capacity?.regions[0]} loading={capacityQuery.isPending} />
      </section>

      <Card className="min-h-105 flex-1 rounded-lg [&_.arco-card-body]:p-0">
        <Tabs defaultActiveTab="devices" type="line">
          <Tabs.TabPane key="devices" title="设备列表">
            <GpuDeviceList />
          </Tabs.TabPane>
          <Tabs.TabPane key="events" title="联动事件">
            <GpuEventList />
          </Tabs.TabPane>
        </Tabs>
      </Card>
    </ResourcePageFrame>
  );
}
