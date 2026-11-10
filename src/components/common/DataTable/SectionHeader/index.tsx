import { Typography } from "@arco-design/web-react";
import clsx from "clsx";
import type { ReactNode } from "react";

export type SectionHeaderProps = {
  title?: ReactNode;
  description?: ReactNode;
  extra?: ReactNode;
  className?: string;
};

export default function SectionHeader({
  title,
  description,
  extra,
  className = "mb-3",
}: SectionHeaderProps) {
  return (
    <div
      className={clsx(
        "flex min-w-0 shrink-0 flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="min-w-0">
        {title !== undefined && title !== null ? (
          <Typography.Title heading={6} className="m-0!">
            {title}
          </Typography.Title>
        ) : null}
        {description ? (
          <div className="mt-1 text-xs text-[var(--color-text-3)]">{description}</div>
        ) : null}
      </div>
      {extra ? <div className="shrink-0">{extra}</div> : null}
    </div>
  );
}
