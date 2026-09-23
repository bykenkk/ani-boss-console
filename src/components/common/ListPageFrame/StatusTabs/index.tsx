import { Tabs } from "@arco-design/web-react";
import styles from "./index.module.less";

export type ListStatusTab<T extends string> = {
  value: T;
  label: string;
};

type StatusTabsProps<T extends string> = {
  items: Array<ListStatusTab<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
};

export function StatusTabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel = "状态筛选",
}: StatusTabsProps<T>) {
  return (
    <div className={styles.statusTabs} aria-label={ariaLabel}>
      <Tabs activeTab={value} onChange={(key) => onChange(key as T)} type="line">
        {items.map((item) => (
          <Tabs.TabPane key={item.value} title={item.label} />
        ))}
      </Tabs>
    </div>
  );
}
