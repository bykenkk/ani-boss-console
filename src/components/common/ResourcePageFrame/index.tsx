import { Space, Tooltip } from "@arco-design/web-react";
import clsx from "clsx";
import { forwardRef, isValidElement, type ButtonHTMLAttributes, type ReactNode } from "react";
import type {
  ListPageHeaderProps,
  ResourcePageFrameProps,
  ResourcePageHeaderAction,
  ResourcePageHeaderConfig,
} from "./types";
import styles from "./index.module.less";

type ToolbarButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  iconClassName?: string;
  variant?: "primary" | "outline" | "secondary" | "danger";
};

const ToolbarButton = forwardRef<HTMLButtonElement, ToolbarButtonProps>(function ToolbarButton(
  { iconClassName, variant = "outline", className = "", children, ...buttonProps },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      className={clsx(styles.toolbarButton, styles[`toolbarButton_${variant}`], className)}
      {...buttonProps}
    >
      {iconClassName ? <i className={clsx("iconfont", iconClassName)} aria-hidden="true" /> : null}
      {children}
    </button>
  );
});

function ResourcePageTitle({
  iconClassName,
  title,
  subtitle,
}: {
  iconClassName?: string;
  title: ReactNode;
  subtitle?: ReactNode;
}) {
  return (
    <>
      {iconClassName ? (
        <div className={styles.pageHeaderIcon} aria-hidden="true">
          <i className={clsx("iconfont", iconClassName)} />
        </div>
      ) : null}
      <div className={styles.pageHeaderTitleArea}>
        <h1 className={styles.pageHeaderTitle}>{title}</h1>
        {subtitle ? <p className={styles.pageHeaderSubtitle}>{subtitle}</p> : null}
      </div>
    </>
  );
}

function ResourcePageHeaderActionButton({ action }: { action: ResourcePageHeaderAction }) {
  const button = (
    <ToolbarButton
      {...action.buttonProps}
      iconClassName={action.iconClassName}
      variant={action.variant}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </ToolbarButton>
  );

  if (!action.tooltip) return button;

  return (
    <Tooltip content={action.tooltip}>
      <span>{button}</span>
    </Tooltip>
  );
}

export function ListPageHeader({
  iconClassName,
  title,
  subtitle,
  actions,
  extra,
}: ListPageHeaderProps) {
  const actionArea = actions?.length ? (
    <Space size={8}>
      {actions.map((action) => (
        <ResourcePageHeaderActionButton key={action.key} action={action} />
      ))}
    </Space>
  ) : (
    extra
  );

  return (
    <header className={styles.pageHeader}>
      <ResourcePageTitle iconClassName={iconClassName} title={title} subtitle={subtitle} />
      {actionArea ? <div className={styles.pageHeaderExtra}>{actionArea}</div> : null}
    </header>
  );
}

function isResourcePageHeaderConfig(
  header: ResourcePageHeaderConfig | ReactNode,
): header is ResourcePageHeaderConfig {
  return (
    typeof header === "object" &&
    header !== null &&
    !isValidElement(header) &&
    !Array.isArray(header) &&
    "title" in header
  );
}

export function ResourcePageFrame({ header, children }: ResourcePageFrameProps) {
  return (
    <div className={styles.page}>
      {isResourcePageHeaderConfig(header) ? <ListPageHeader {...header} /> : header}
      {children}
    </div>
  );
}

export type {
  ListPageHeaderProps,
  ResourcePageFrameProps,
  ResourcePageHeaderAction,
  ResourcePageHeaderConfig,
} from "./types";
