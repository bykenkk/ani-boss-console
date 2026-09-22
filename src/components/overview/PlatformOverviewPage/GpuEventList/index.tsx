import { Empty } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import {
  fetchGpuInventoryEvents,
  gpuResourcePoolQueryKeys,
  type GpuInventoryEvent,
} from "@/api/gpu-inventory";
import { formatDateTimeMinute } from "@/lib/date";
import { SoftList } from "../../SoftList";
import { SoftRow } from "../../SoftList/SoftRow";

function eventTitle(event: GpuInventoryEvent) {
  const target = event.nodeName || event.deviceId || "GPU 集群";
  const action = event.eventType === "partition_applied" ? "已应用 GPU 切分" : "状态已更新";
  return `${target} ${action}${event.reason ? ` · ${event.reason}` : ""}`;
}

function eventMeta(event: GpuInventoryEvent) {
  const createdAt = formatDateTimeMinute(event.createdAt);
  return event.actor ? `${event.actor} · ${createdAt}` : createdAt;
}

export function GpuEventList() {
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

  if (eventsQuery.isPending) {
    return (
      <div className="flex min-h-85 items-center justify-center text-sm text-(--color-text-3)">
        正在加载联动事件…
      </div>
    );
  }

  const events = eventsQuery.data?.items || [];
  if (events.length === 0) {
    return (
      <div className="flex min-h-85 items-center justify-center">
        <Empty description="暂无 GPU 联动事件" />
      </div>
    );
  }

  return (
    <SoftList>
      {events.map((event) => (
        <SoftRow key={event.id} title={eventTitle(event)} meta={eventMeta(event)} />
      ))}
    </SoftList>
  );
}
