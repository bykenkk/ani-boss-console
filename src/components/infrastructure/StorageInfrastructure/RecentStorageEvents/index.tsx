import clsx from "clsx";
import { ListDataTable, TableSectionFrame, type ListColumn } from "@/components/common";
import { formatDateTimeMinute } from "@/lib/date";

interface StoragePlatformEvent {
  id: string;
  at: string;
  type: "normal" | "warning";
  message: string;
}

const recentPlatformEvents: StoragePlatformEvent[] = [
  {
    id: "event-nfs-latency",
    at: "2026-07-23 10:05",
    type: "warning",
    message: "文件存储 · NFS CSI：挂载目标 mt-b 延迟超过 80ms",
  },
  {
    id: "event-ceph-expand",
    at: "2026-07-22 18:10",
    type: "normal",
    message: "块存储池 · Rook-Ceph：OSD 扩容 +4 完成",
  },
  {
    id: "event-vector-compact",
    at: "2026-07-22 08:00",
    type: "normal",
    message: "向量后端 · Milvus：索引压缩任务完成",
  },
  {
    id: "event-minio-growth",
    at: "2026-07-21 11:40",
    type: "normal",
    message: "对象存储 · MinIO：存储桶数量增长正常",
  },
  {
    id: "event-nfs-target",
    at: "2026-07-19 14:20",
    type: "normal",
    message: "文件存储 · NFS CSI：新增挂载目标 az-b",
  },
];

const columns: ListColumn<StoragePlatformEvent>[] = [
  {
    title: "时间",
    dataIndex: "at",
    width: 170,
    render: (value: string) => formatDateTimeMinute(value),
  },
  {
    title: "级别",
    dataIndex: "type",
    width: 90,
    render: (value: StoragePlatformEvent["type"]) => (
      <span
        className={clsx(
          "inline-flex rounded px-2 py-0.5 text-xs font-medium",
          value === "warning" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700",
        )}
      >
        {value === "warning" ? "警告" : "正常"}
      </span>
    ),
  },
  { title: "事件", dataIndex: "message" },
];

export function RecentStorageEvents() {
  return (
    <TableSectionFrame>
      <ListDataTable
        header={{
          title: "最近平台事件",
          description: "汇总存储后端近期健康、容量和基础设施变化。",
          extra: (
            <span className="text-xs text-gray-500">最近 {recentPlatformEvents.length} 条</span>
          ),
        }}
        rowKey="id"
        columns={columns}
        data={recentPlatformEvents}
        pagination={false}
        emptyText="暂无平台事件"
      />
    </TableSectionFrame>
  );
}
