import { Badge } from "@arco-design/web-react";
import clsx from "clsx";
import styles from "./index.module.less";

export type StatusBadgeTone = "default" | "info" | "success" | "warning" | "danger";

interface StatusBadgeProps {
  value?: string | null;
  tone?: StatusBadgeTone;
  processing?: boolean;
  className?: string;
}

const badgeStatus: Record<
  StatusBadgeTone,
  "default" | "processing" | "success" | "warning" | "error"
> = {
  default: "default",
  info: "processing",
  success: "success",
  warning: "warning",
  danger: "error",
};

export function StatusBadge({
  value,
  tone = "default",
  processing = false,
  className,
}: StatusBadgeProps) {
  if (value === null || value === undefined || value === "") {
    return <span className={styles.empty}>-</span>;
  }

  return (
    <span className={clsx(styles.badge, styles[tone], processing && styles.processing, className)}>
      <Badge status={badgeStatus[tone]} text={value} />
    </span>
  );
}
