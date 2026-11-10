import { ToolbarIconButton } from "@/components/common";

// TODO(resource-status-integration): 接入 AI 服务及知识库运营态势接口后开放刷新操作。
export function OverviewRefreshButton() {
  return <ToolbarIconButton label="刷新" type="primary" disabled />;
}
