import type { ReactNode } from "react";
import { Typography } from "@arco-design/web-react";
import { DataTable, StatusBadge } from "@/components/common";
import type { AlertItem } from "@/components/overview/model";
import { formatMonthDayTime } from "@/lib/date";
import { LevelTag } from "../../LevelTag";

interface AlertTableProps {
  rows: AlertItem[];
  extra?: ReactNode;
  onUpdate: (id: number, status: AlertItem["status"]) => void;
}

export function AlertTable({ rows, onUpdate, extra }: AlertTableProps) {
  return (
    <DataTable
      header={{ title: "平台告警", extra }}
      rowKey="id"
      data={rows}
      pagination={false}
      noDataElement="暂无平台告警"
      rowActions={[
        {
          key: "handle",
          label: "处理",
          visible: (item) => item.status === "待处理",
          onClick: (item) => onUpdate(item.id, "已处理"),
        },
        {
          key: "ignore",
          label: "忽略",
          visible: (item) => item.status === "待处理",
          onClick: (item) => onUpdate(item.id, "已忽略"),
        },
      ]}
      columns={[
        {
          title: "级别",
          dataIndex: "level",
          width: 90,
          render: (_: unknown, item: AlertItem) => <LevelTag level={item.level} />,
        },
        {
          title: "标题 / 摘要",
          dataIndex: "title",
          width: 260,
          render: (_: unknown, item: AlertItem) => (
            <div>
              <Typography.Text bold>{item.title}</Typography.Text>
              <Typography.Text type="secondary" className="mt-1 block text-xs">
                {item.summary}
              </Typography.Text>
            </div>
          ),
        },
        {
          title: "对象",
          dataIndex: "objectType",
          width: 150,
          render: (_: unknown, item: AlertItem) => (
            <div>
              <Typography.Text>{item.objectType}</Typography.Text>
              <Typography.Text type="secondary" className="mt-1 block text-xs">
                {item.objectName}
              </Typography.Text>
            </div>
          ),
        },
        { title: "区域", dataIndex: "region", width: 120 },
        {
          title: "时间",
          dataIndex: "time",
          width: 120,
          render: (value: string) => formatMonthDayTime(value),
        },
        {
          title: "状态",
          dataIndex: "status",
          width: 120,
          render: (_: unknown, item: AlertItem) => (
            <StatusBadge
              tone={item.status === "待处理" ? "warning" : "success"}
              value={item.status}
            />
          ),
        },
      ]}
    />
  );
}
