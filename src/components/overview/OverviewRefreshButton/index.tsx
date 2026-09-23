import { Button } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { showMessage } from "@/lib/feedback";

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
