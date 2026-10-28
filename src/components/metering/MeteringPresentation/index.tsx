import { Progress, Tooltip } from "@arco-design/web-react";
import type { ResourceUsageQuality } from "@/api/resource-usage";
import { StatusBadge, type StatusBadgeTone } from "@/components/common";
import { formatDateTimeMinute } from "@/lib/date";
import { formatUsage } from "@/lib/metering";
import styles from "./index.module.less";

interface UsageShareProps {
  share?: number | null;
}

export function UsageShare({ share }: UsageShareProps) {
  if (share === undefined || share === null) return <span>-</span>;
  const percent = share * 100;
  return (
    <div className={styles.share}>
      <Progress percent={percent} showText={false} strokeWidth={6} color="#2b5ce6" />
      <strong>{percent > 0 && percent < 0.01 ? "<0.01" : formatUsage(percent)}%</strong>
    </div>
  );
}

interface UsageValueProps {
  value?: number | null;
  knownValue?: number | null;
  unit?: string;
}

export function UsageValue({ value, knownValue, unit }: UsageValueProps) {
  const complete = value !== undefined && value !== null;
  return (
    <span>
      {complete ? formatUsage(value) : "-"}
      {complete && unit && <small className={styles.unit}>{unit}</small>}
      {!complete && knownValue !== undefined && knownValue !== null && (
        <span className="mt-1 block text-xs font-normal text-gray-500">
          已知部分 {formatUsage(knownValue)} {unit}
        </span>
      )}
    </span>
  );
}

const qualityLabels: Record<ResourceUsageQuality["status"], string> = {
  OK: "完整",
  PARTIAL: "部分数据",
  NO_DATA: "无数据",
  UNAVAILABLE: "暂不可用",
};

const qualityTones: Record<ResourceUsageQuality["status"], StatusBadgeTone> = {
  OK: "success",
  PARTIAL: "warning",
  NO_DATA: "default",
  UNAVAILABLE: "danger",
};

interface UsageQualityProps {
  quality?: ResourceUsageQuality;
}

export function UsageQuality({ quality }: UsageQualityProps) {
  if (!quality) return <span>-</span>;
  return (
    <Tooltip
      content={
        <div>
          <div>
            观测点：{quality.observedPoints} / {quality.expectedPoints}
          </div>
          {quality.coverage !== undefined && quality.coverage !== null && (
            <div>覆盖率：{formatUsage(quality.coverage * 100)}%</div>
          )}
          {quality.availableFrom && (
            <div>可用起点：{formatDateTimeMinute(quality.availableFrom)}</div>
          )}
          {quality.reasons?.length > 0 && <div>{quality.reasons.join("、")}</div>}
        </div>
      }
    >
      <span>
        <StatusBadge value={qualityLabels[quality.status]} tone={qualityTones[quality.status]} />
      </span>
    </Tooltip>
  );
}
