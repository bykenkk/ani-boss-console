import { Card, Tooltip } from "@arco-design/web-react";
import {
  IconApps,
  IconBranch,
  IconDesktop,
  IconStorage,
  IconWifi,
} from "@arco-design/web-react/icon";
import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { array, field, nativeObject, text } from "../../model";
import styles from "./index.module.less";

const conditionDefinitions = [
  {
    type: "Ready",
    icon: IconDesktop,
    label: "节点就绪",
    healthyStatus: "True",
    healthy: "已就绪",
    unhealthy: "未就绪",
  },
  {
    type: "MemoryPressure",
    icon: IconApps,
    label: "内存压力",
    healthyStatus: "False",
    healthy: "正常",
    unhealthy: "内存不足",
  },
  {
    type: "DiskPressure",
    icon: IconStorage,
    label: "磁盘压力",
    healthyStatus: "False",
    healthy: "正常",
    unhealthy: "磁盘不足",
  },
  {
    type: "PIDPressure",
    icon: IconBranch,
    label: "进程压力",
    healthyStatus: "False",
    healthy: "正常",
    unhealthy: "进程资源不足",
  },
  {
    type: "NetworkUnavailable",
    icon: IconWifi,
    label: "网络可用性",
    healthyStatus: "False",
    healthy: "正常",
    unhealthy: "网络不可用",
  },
];

export function NodeHealth({ resource }: { resource: ClusterOpsResourceDocument }) {
  const object = nativeObject(resource);
  const conditions = array(field(object, "status", "conditions"));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {conditionDefinitions.map((definition) => {
        const condition = conditions.find((item) => field(item, "type") === definition.type);
        const status = field(condition, "status");
        const known = status === "True" || status === "False";
        const healthy = status === definition.healthyStatus;
        const statusLabel = !known ? "未知" : healthy ? definition.healthy : definition.unhealthy;
        const Icon = definition.icon;
        return (
          <Card key={definition.type} className="bg-(--color-fill-1)!" size="small">
            <div className="flex items-center gap-3 py-2">
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center text-3xl text-(--color-text-2)">
                <Icon aria-hidden />
                <Tooltip
                  trigger={["hover", "focus"]}
                  content={
                    <div className="flex max-w-sm flex-col gap-2">
                      <span className="font-medium">
                        {definition.label} · {statusLabel}
                      </span>
                      <p className="m-0 break-words text-xs leading-5">
                        {condition
                          ? text(field(condition, "message") || field(condition, "reason"))
                          : "节点未上报此项状态"}
                      </p>
                      <div className="flex flex-col gap-1 text-xs">
                        <span>
                          状态变更：{formatDateTime(text(field(condition, "lastTransitionTime")))}
                        </span>
                        <span>
                          最近心跳：{formatDateTime(text(field(condition, "lastHeartbeatTime")))}
                        </span>
                      </div>
                    </div>
                  }
                >
                  <span
                    tabIndex={0}
                    aria-label={`${definition.label}：${statusLabel}`}
                    className={styles.indicatorTrigger}
                  >
                    <StatusBadge
                      value={statusLabel}
                      tone={!known ? "default" : healthy ? "success" : "danger"}
                      className={styles.indicator}
                    />
                  </span>
                </Tooltip>
              </span>
              <span className="whitespace-nowrap text-xs font-medium">{definition.label}</span>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
