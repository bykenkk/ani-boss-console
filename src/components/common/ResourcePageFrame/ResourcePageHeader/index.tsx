import { Button, Space, Tooltip } from "@arco-design/web-react";
import type { ReactNode } from "react";
import type { ResourcePageHeaderAction, ResourcePageHeaderConfig } from "../types";
import styles from "../index.module.less";

interface ResourcePageTitleProps {
  icon?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
}
function ResourcePageTitle({ icon, title, subtitle }: ResourcePageTitleProps) {
  return (
    <>
      {icon ? (
        <div className={styles.pageHeaderIcon} aria-hidden="true">
          {icon}
        </div>
      ) : null}
      <div className={styles.pageHeaderTitleArea}>
        <h1
          className={styles.pageHeaderTitle}
          title={typeof title === "string" ? title : undefined}
        >
          {title}
        </h1>
        {subtitle ? (
          <p
            className={styles.pageHeaderSubtitle}
            title={typeof subtitle === "string" ? subtitle : undefined}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
    </>
  );
}

interface ResourcePageHeaderActionButtonProps {
  action: ResourcePageHeaderAction;
}
function ResourcePageHeaderActionButton({ action }: ResourcePageHeaderActionButtonProps) {
  const button = (
    <Button
      {...action.buttonProps}
      icon={action.icon}
      type={
        action.variant === "primary"
          ? "primary"
          : action.variant === "secondary"
            ? "secondary"
            : "outline"
      }
      status={action.variant === "danger" ? "danger" : undefined}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.label}
    </Button>
  );
  return action.tooltip ? (
    <Tooltip content={action.tooltip}>
      <span>{button}</span>
    </Tooltip>
  ) : (
    button
  );
}

export function ResourcePageHeader({
  icon,
  title,
  subtitle,
  actions,
  extra,
}: ResourcePageHeaderConfig) {
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
      <ResourcePageTitle icon={icon} title={title} subtitle={subtitle} />
      {actionArea ? <div className={styles.pageHeaderExtra}>{actionArea}</div> : null}
    </header>
  );
}
