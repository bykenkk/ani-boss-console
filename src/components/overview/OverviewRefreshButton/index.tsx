import { Button } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";

// TODO(resource-status-integration): 接入 AI 服务及知识库运营态势接口后开放刷新操作。
export function OverviewRefreshButton() {
  return (
    <Button type="primary" icon={<IconRefresh />} disabled>
      刷新
    </Button>
  );
}
