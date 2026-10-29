import { Progress } from "@arco-design/web-react";

interface NetworkAvailabilityProps {
  percent: number;
}

export function NetworkAvailability({ percent }: NetworkAvailabilityProps) {
  return (
    <div className="flex items-center gap-3" aria-label={`IPv4 地址可用量 ${percent.toFixed(2)}%`}>
      <Progress percent={percent} showText={false} className="min-w-16 flex-1" />
      <span className="shrink-0 text-[rgb(var(--primary-6))]">{percent.toFixed(2)}%</span>
    </div>
  );
}
