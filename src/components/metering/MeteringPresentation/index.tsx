import { Progress } from "@arco-design/web-react";
import { getChangeRate } from "@/lib/metering";
import styles from "./index.module.less";

export function UsageShare({ value, total }: { value: number; total: number }) {
  const percent = total > 0 ? (value / total) * 100 : 0;
  return (
    <div className={styles.share}>
      <Progress
        percent={Math.max(0, Math.min(100, percent))}
        showText={false}
        strokeWidth={6}
        color="#2b5ce6"
      />
      <strong>{percent > 0 && percent < 0.01 ? "<0.01" : Number(percent.toFixed(2))}%</strong>
    </div>
  );
}

export function UsageChange({
  current,
  previous,
  previousLabel = "上期",
}: {
  current?: number;
  previous?: number;
  previousLabel?: string;
}) {
  if (current === undefined || previous === undefined) return <span>-</span>;
  if (previous === 0)
    return (
      <span className={current > 0 ? styles.chip : styles.hint}>
        {current > 0 ? "新增" : `${previousLabel}无用量`}
      </span>
    );
  const rate = getChangeRate(current, previous)!;
  return (
    <span style={{ color: rate > 0 ? "#e6862b" : rate < 0 ? "#22a06b" : "#9aa3b5" }}>
      {rate > 0 ? "+" : ""}
      {rate.toFixed(1)}%
    </span>
  );
}
