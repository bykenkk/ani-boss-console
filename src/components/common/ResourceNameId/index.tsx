import { Tooltip } from "@arco-design/web-react";
import type { ReactNode } from "react";
import styles from "./index.module.less";

export type ResourceNameIdProps = {
  name: ReactNode;
  avatarText?: string;
  id?: string | null;
};

export function ResourceNameId({ name, id, avatarText }: ResourceNameIdProps) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      {avatarText && (
        <span className={styles.avatar} aria-hidden>
          {avatarText.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={styles.name} title={typeof name === "string" ? name : undefined}>
          {name}
        </span>
        <span className="min-w-0 text-xs leading-4 text-[var(--color-text-2)]">
          {id && id !== "-" ? (
            <Tooltip content={id}>
              <span className="block truncate font-mono">{id}</span>
            </Tooltip>
          ) : (
            "-"
          )}
        </span>
      </div>
    </div>
  );
}
