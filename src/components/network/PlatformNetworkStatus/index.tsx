import { StatusBadge } from "@/components/common";
interface PlatformNetworkStatusProps {
  state: string;
}
export function PlatformNetworkStatus({ state }: PlatformNetworkStatusProps) {
  const labels: Record<string, string> = {
    provisioning: "创建中",
    available: "可用",
    degraded: "降级",
    failed: "失败",
    deleting: "删除中",
    deleted: "已删除",
  };
  return (
    <StatusBadge
      value={labels[state] ?? state}
      tone={state === "available" ? "success" : state === "failed" ? "danger" : "default"}
    />
  );
}
