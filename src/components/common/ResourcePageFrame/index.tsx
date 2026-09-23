import clsx from "clsx";
import { ResourcePageHeader } from "./ResourcePageHeader";
import type { ResourcePageFrameProps } from "./types";
import styles from "./index.module.less";

export function ResourcePageFrame({ header, className, children }: ResourcePageFrameProps) {
  return (
    <div className={clsx(styles.page, className)}>
      <ResourcePageHeader {...header} />
      {children}
    </div>
  );
}

export type {
  ResourcePageFrameProps,
  ResourcePageHeaderAction,
  ResourcePageHeaderConfig,
} from "./types";
