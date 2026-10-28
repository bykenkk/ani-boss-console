import clsx from "clsx";
import { IconThunderbolt, IconSettings, IconStorage } from "@arco-design/web-react/icon";
import type { MetricUsage } from "@/api/resource-usage";
import { UsageQuality, UsageValue } from "../MeteringPresentation";
import styles from "../MeteringPresentation/index.module.less";
import { meteringDimensions, type MeteringDimension } from "../model";

interface MeteringDimensionCardsProps {
  dimension: MeteringDimension;
  metrics: readonly MetricUsage[];
  onChange: (dimension: MeteringDimension) => void;
}

const icons = { gpu: IconThunderbolt, cpu: IconSettings, memory: IconStorage };

export function MeteringDimensionCards({
  dimension,
  metrics,
  onChange,
}: MeteringDimensionCardsProps) {
  return (
    <div className={styles.cards} role="group" aria-label="资源使用维度">
      {meteringDimensions.map((item) => {
        const selected = item.key === dimension;
        const usage = metrics.find((value) => value.metric === item.key);
        const Icon = icons[item.key];
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.key)}
            className={clsx(styles.dimension, selected && styles.selected)}
          >
            <span className={styles.cardHead}>
              <span className={clsx(styles.icon, styles[item.key])}>
                <Icon />
              </span>
              <span>
                <span className={styles.label}>{item.cardLabel}</span>
                <span className={styles.subtitle}>平均{item.label}</span>
              </span>
              {selected && <span className={styles.selectedLabel}>当前维度</span>}
            </span>
            <span className={styles.value}>
              <UsageValue value={usage?.mean} knownValue={usage?.knownMean} unit={item.unit} />
            </span>
            <span className={styles.foot} style={{ display: "block" }}>
              <UsageQuality quality={usage?.quality} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
