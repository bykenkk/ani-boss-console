import clsx from "clsx";
import { ListDataTable, TableSectionFrame, type ListColumn } from "@/components/common";
import { formatDateTimeMinute } from "@/lib/date";

interface TenantStorageEvent {
  id: string;
  at: string;
  type: "quota" | "request" | "warning";
  tenant: string;
  message: string;
}

const recentEvents: TenantStorageEvent[] = [
  {
    id: "event-expand-acme",
    at: "2026-07-23 10:18",
    type: "request",
    tenant: "Acme AI",
    message: "申请 ESSD 配额从 1,536 Gi 扩容至 3,072 Gi",
  },
  {
    id: "event-hot-acme",
    at: "2026-07-23 10:05",
    type: "warning",
    tenant: "Acme AI",
    message: "ESSD 配额水位达到 91%，进入高水位关注",
  },
  {
    id: "event-quota-demo",
    at: "2026-07-22 16:40",
    type: "quota",
    tenant: "演示租户 demo-corp",
    message: "对象存储与带宽配额同步完成",
  },
  {
    id: "event-trial-init",
    at: "2026-07-21 09:30",
    type: "quota",
    tenant: "试用实验室",
    message: "初始化试用租户存储配额",
  },
];

const typeMeta = {
  quota: { label: "配额", className: "bg-blue-50 text-blue-700" },
  request: { label: "申请", className: "bg-orange-50 text-orange-700" },
  warning: { label: "预警", className: "bg-red-50 text-red-700" },
} as const;

const columns: ListColumn<TenantStorageEvent>[] = [
  {
    title: "时间",
    dataIndex: "at",
    width: 170,
    render: (value: string) => formatDateTimeMinute(value),
  },
  {
    title: "类型",
    dataIndex: "type",
    width: 90,
    render: (value: TenantStorageEvent["type"]) => (
      <span
        className={clsx(
          "inline-flex rounded px-2 py-0.5 text-xs font-medium",
          typeMeta[value].className,
        )}
      >
        {typeMeta[value].label}
      </span>
    ),
  },
  { title: "租户", dataIndex: "tenant", width: 190 },
  { title: "事件", dataIndex: "message" },
];

export function TenantStorageRecentEvents() {
  return (
    <TableSectionFrame>
      <ListDataTable
        header={{
          title: "最近事件",
          description: "记录租户存储配额、水位与扩容申请的近期变化。",
          extra: <span className="text-xs text-gray-500">最近 {recentEvents.length} 条</span>,
        }}
        rowKey="id"
        columns={columns}
        data={recentEvents}
        pagination={false}
        emptyText="暂无租户存储事件"
      />
    </TableSectionFrame>
  );
}
