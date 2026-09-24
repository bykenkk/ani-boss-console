import type { ReactNode } from "react";
import styles from "./index.module.less";

export interface SummaryItem {
  label: string;
  value: ReactNode;
  unit?: string;
  note?: string;
}

export function SummaryStrip({
  items,
  pending = false,
}: {
  items: SummaryItem[];
  pending?: boolean;
}) {
  return (
    <section className={styles.strip} aria-label="数据摘要" aria-busy={pending}>
      {items.map((item) => (
        <div className={styles.cell} key={item.label}>
          <span className={styles.label}>{item.label}</span>
          <strong className={styles.value}>
            {pending ? "-" : item.value}
            <small>{item.unit}</small>
          </strong>
          {item.note && <span className={styles.note}>{item.note}</span>}
        </div>
      ))}
    </section>
  );
}
