import { Button, Card, Empty, Tag, Typography } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import { ResourcePageFrame } from "@/components/common";

interface AuditPlannedPageProps {
  description: string;
  title: string;
}

export function AuditPlannedPage({ description, title }: AuditPlannedPageProps) {
  const navigate = useNavigate();

  return (
    <ResourcePageFrame header={{ title, extra: <Tag color="gray">P1 · 规划</Tag> }}>
      <Card className="rounded-md border-transparent">
        <div className="flex min-h-[360px] flex-col items-center justify-center gap-3 text-center">
          <Empty description="本期暂未开放" />
          <Typography.Text type="secondary">{description}</Typography.Text>
          <Button type="primary" onClick={() => void navigate({ to: "/audit" })}>
            返回平台审计日志
          </Button>
        </div>
      </Card>
    </ResourcePageFrame>
  );
}
