import { Progress } from "@arco-design/web-react";
import type { ReactNode } from "react";
import clsx from "clsx";
import styles from "./index.module.less";

export function MetricCard({
  label,
  value,
  unit,
  subtitle,
  foot,
  icon,
  tone = "blue",
  percent,
}: {
  label: string;
  value: ReactNode;
  unit?: string;
  subtitle?: string;
  foot?: ReactNode;
  icon: ReactNode;
  tone?: "blue" | "green" | "amber" | "red" | "purple";
  percent?: number;
}) {
  return (
    <section className={clsx(styles.card, styles[tone])}>
      <div className={styles.head}>
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
        <div>
          <div className={styles.label}>{label}</div>
          <div className={styles.subtitle}>{subtitle}</div>
        </div>
      </div>
      <div className={styles.value}>
        {value}
        <small>{unit}</small>
      </div>
      {percent !== undefined && (
        <Progress
          percent={Math.max(0, Math.min(100, percent))}
          showText={false}
          strokeWidth={5}
          color={tone === "green" ? "#22a06b" : "#2b5ce6"}
        />
      )}
      {foot && <div className={styles.foot}>{foot}</div>}
    </section>
  );
}
