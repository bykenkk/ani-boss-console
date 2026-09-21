import { Alert, Button, Empty, Tabs } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchGpuInventory,
  fetchGpuInventoryEvents,
  fetchGpuOccupancy,
  fetchTenantGpuAllocations,
  gpuResourcePoolQueryKeys,
  type GpuInventoryEvent,
} from "@/api/gpu-inventory";
import { ListPageFrame, ListPageHeader } from "@/components/common";
import { formatDateTimeMinute } from "@/lib/date";
import { GpuDeviceTable } from "../GpuDeviceTable";
import { Metric } from "../Metric";
import { SoftList } from "../SoftList";
import { SoftRow } from "../SoftList/SoftRow";

type StatusTab = "devices" | "events";

function metricValue(value: number | undefined, pending: boolean) {
  return pending || value === undefined ? "-" : String(value);
}

function eventTitle(event: GpuInventoryEvent) {
  const target = event.nodeName || event.deviceId || "GPU 集群";
  const action = event.eventType === "partition_applied" ? "已应用 GPU 切分" : "状态已更新";
  return `${target} ${action}${event.reason ? ` · ${event.reason}` : ""}`;
}

function eventMeta(event: GpuInventoryEvent) {
  const createdAt = formatDateTimeMinute(event.createdAt);
  return event.actor ? `${event.actor} · ${createdAt}` : createdAt;
}

export function GpuResourcePoolStatusPage() {
  const [activeTab, setActiveTab] = useState<StatusTab>("devices");
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
        action: "GPU 资源池汇总加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.occupancy,
    queryFn: fetchGpuOccupancy,
  });
  const tenantsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-gpu-allocations",
        action: "GPU 预留额度汇总加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.tenants,
    queryFn: fetchTenantGpuAllocations,
  });
  const eventsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "gpu-inventory-events",
        action: "GPU 联动事件加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.events,
    queryFn: fetchGpuInventoryEvents,
  });

  const refreshAll = async () => {
    await Promise.all([
      inventoryQuery.refetch(),
      occupancyQuery.refetch(),
      tenantsQuery.refetch(),
      eventsQuery.refetch(),
    ]);
  };

  const occupancy = occupancyQuery.data;
  const devices = inventoryQuery.data?.items || [];
  const events = eventsQuery.data?.items || [];
  const reservedCount = tenantsQuery.data?.reduce(
    (total, tenant) => total + tenant.allocatedGpuCount,
    0,
  );
  const abnormalCount = occupancy
    ? occupancy.fault + occupancy.maintenanceCount + occupancy.unavailableCount
    : undefined;
  const refreshing =
    inventoryQuery.isFetching ||
    occupancyQuery.isFetching ||
    tenantsQuery.isFetching ||
    eventsQuery.isFetching;
  const profile = inventoryQuery.data?.profile;
  const summary = (
    <>
      {profile && !profile.realProvider ? (
        <Alert
          type="warning"
          showIcon
          content={`GPU 资源池数据可能不完整。数据源：${profile.provider || "-"}。${profile.reason ? ` ${profile.reason}` : ""}`}
        />
      ) : null}

      <section className="grid flex-none grid-cols-5 gap-3.5 max-[1280px]:grid-cols-2">
        <Metric
          label="物理卡 / 逻辑卡"
          value={
            occupancyQuery.isPending || !occupancy
              ? "- / -"
              : `${occupancy.physicalCardCount} / ${occupancy.logicalCardCount}`
          }
          hint={!occupancy ? "-" : occupancy.logicalCardCount ? "含 vGPU 切分" : "当前均为整卡"}
        />
        <Metric
          label="空闲未分配"
          value={metricValue(occupancy?.available, occupancyQuery.isPending)}
          hint="可切分 / 可用"
        />
        <Metric
          label="已预留"
          value={metricValue(reservedCount, tenantsQuery.isPending)}
          hint={
            reservedCount === undefined
              ? "额度口径，不绑定具体卡"
              : reservedCount > 0
                ? "额度口径，不绑定具体卡"
                : "未设置预留额度"
          }
        />
        <Metric
          label="已占用"
          value={metricValue(occupancy?.inUse, occupancyQuery.isPending)}
          hint={occupancy ? `覆盖 ${occupancy.tenantCount} 个租户` : "-"}
        />
        <Metric
          label="异常"
          value={metricValue(abnormalCount, occupancyQuery.isPending)}
          hint={
            occupancy
              ? `维护 ${occupancy.maintenanceCount} · 不可用 ${occupancy.unavailableCount} · 故障 ${occupancy.fault}`
              : "-"
          }
          tone={abnormalCount ? "danger" : ""}
        />
      </section>
    </>
  );

  return (
    <ListPageFrame
      header={
        <>
          <ListPageHeader
            title="GPU总览"
            subtitle="查看物理卡、逻辑卡及设备切分、占用和异常状态。"
            extra={
              <Button loading={refreshing} onClick={() => void refreshAll()}>
                刷新
              </Button>
            }
          />
          {summary}
        </>
      }
      tabs={
        <Tabs
          activeTab={activeTab}
          type="line"
          className="flex-none px-4 pt-1"
          onChange={(key) => setActiveTab(key as StatusTab)}
        >
          <Tabs.TabPane key="devices" title="设备列表" />
          <Tabs.TabPane key="events" title="联动事件" />
        </Tabs>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col">
        {activeTab === "devices" ? (
          <GpuDeviceTable data={devices} loading={inventoryQuery.isPending} />
        ) : eventsQuery.isPending ? (
          <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
            正在加载联动事件…
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <Empty description="暂无 GPU 联动事件" />
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <SoftList>
              {events.map((event) => (
                <SoftRow key={event.id} title={eventTitle(event)} meta={eventMeta(event)} />
              ))}
            </SoftList>
          </div>
        )}
      </div>
    </ListPageFrame>
  );
}
