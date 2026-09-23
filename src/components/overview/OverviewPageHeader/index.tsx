import { Button } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import type { ReactNode } from "react";
import { ListPageHeader } from "@/components/common";
import { showMessage } from "@/lib/feedback";

interface OverviewPageHeaderProps {
  title: string;
  subtitle: string;
  extra?: ReactNode;
}

export function OverviewPageHeader({ title, subtitle, extra }: OverviewPageHeaderProps) {
  return (
    <ListPageHeader
      title={title}
      subtitle={subtitle}
      extra={
        <div className="flex items-center gap-2">
          {extra}
          <Button
            type="primary"
            icon={<IconRefresh />}
            onClick={() => showMessage({ type: "success", content: "数据已刷新" })}
          >
            刷新
          </Button>
        </div>
      }
    />
  );
}
