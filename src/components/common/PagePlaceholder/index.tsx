import { Card, Empty, Typography } from "@arco-design/web-react";
import { ResourcePageFrame } from "../ResourcePageFrame";

interface PagePlaceholderProps {
  title: string;
  priority: "P0" | "P1" | "P2";
}

export function PagePlaceholder({ title, priority }: PagePlaceholderProps) {
  return (
    <ResourcePageFrame header={{ title }}>
      <Card className="rounded-md border-transparent">
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
          <Empty description={`${priority} / 未接入 Store`} />
          <Typography.Title heading={6} className="!m-0">
            页面能力暂未开放
          </Typography.Title>
          <Typography.Text type="secondary">该页尚未纳入有状态操作台种子数据。</Typography.Text>
        </div>
      </Card>
    </ResourcePageFrame>
  );
}
