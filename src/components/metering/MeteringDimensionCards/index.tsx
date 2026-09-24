import clsx from "clsx";
import { IconThunderbolt, IconSettings, IconStorage } from "@arco-design/web-react/icon";
import type { PlatformMeteringResourceType } from "@/api/platform";
import { formatUsage } from "@/lib/metering";
import { UsageChange } from "../MeteringPresentation";
import styles from "../MeteringPresentation/index.module.less";
import { meteringDimensions, type MeteringDimension } from "../model";
interface MeteringDimensionCardsProps {
  dimension: MeteringDimension;
  totals: readonly {
    resourceType: PlatformMeteringResourceType;
    value?: number;
    previous?: number;
  }[];
  previousLabel?: string;
  onChange: (dimension: MeteringDimension) => void;
}
const icons = { gpu: IconThunderbolt, cpu: IconSettings, memory: IconStorage };
const descriptions = { gpu: "显卡占用折算用量", cpu: "核数 × 占用时长", memory: "GiB × 占用时长" };
export function MeteringDimensionCards({
  dimension,
  totals,
  previousLabel = "上月",
  onChange,
}: MeteringDimensionCardsProps) {
  return (
    <div className={styles.cards} role="group" aria-label="计量维度">
      {meteringDimensions.map((item) => {
        const selected = item.key === dimension;
        const total = totals.find((value) => value.resourceType === item.resourceType);
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
                <span className={styles.subtitle}>{descriptions[item.key]}</span>
              </span>
              {selected && <span className={styles.selectedLabel}>当前维度</span>}
            </span>
            <span className={styles.value}>
              {total?.value === undefined ? "-" : formatUsage(total.value)}
              <small className={styles.unit}>{item.cardUnit}</small>
            </span>
            <span className={styles.foot} style={{ display: "block" }}>
              较{previousLabel}{" "}
              <UsageChange
                current={total?.value}
                previous={total?.previous}
                previousLabel={previousLabel}
              />
            </span>
          </button>
        );
      })}
    </div>
  );
}
