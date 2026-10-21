import { Button } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { showMessage } from "@/lib/feedback";

// TODO(resource-status-integration): 接入 AI 服务及知识库运营态势刷新；当前仅提示成功，未刷新数据。
export function OverviewRefreshButton() {
  return (
    <Button
      type="primary"
      icon={<IconRefresh />}
      onClick={() => showMessage({ type: "success", content: "数据已刷新" })}
    >
      刷新
    </Button>
  );
}
