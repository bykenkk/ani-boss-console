import clsx from "clsx";
import { forwardRef, type ReactNode } from "react";
import { Button, Dropdown, Menu, Tooltip, type ButtonProps } from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { MORE_ACTIONS_LABEL } from "../constants";
import styles from "./index.module.less";

export type RowActionIntent = "default" | "danger" | "warning" | "success";

type ActionValue<T, V> = V | ((record: T) => V);

type StaticActionLabel = {
  label: string;
  widthLabel?: never;
};

type DynamicActionLabel<T> = {
  label: (record: T) => string;
  widthLabel: string;
};

type RowActionBase<T> = {
  key: string;
  intent?: RowActionIntent;
  visible?: (record: T) => boolean;
  disabled?: (record: T) => boolean;
  loading?: (record: T) => boolean;
  tooltip?: ActionValue<T, string | undefined>;
  onClick: (record: T) => void | Promise<unknown>;
};

export type RowAction<T> = RowActionBase<T> & (StaticActionLabel | DynamicActionLabel<T>);

interface DataTableRowActionsProps {
  children: ReactNode;
}

interface DataTableRowActionButtonProps extends ButtonProps {
  children: ReactNode;
}

interface ConfiguredDataTableRowActionsProps<T> {
  actions: Array<RowAction<T>>;
  record: T;
}

export function DataTableRowActions({ children }: DataTableRowActionsProps) {
  return <div className={styles.rowActions}>{children}</div>;
}

export const DataTableRowActionButton = forwardRef<
  HTMLButtonElement,
  DataTableRowActionButtonProps
>(function DataTableRowActionButton({ children, ...buttonProps }, ref) {
  return (
    <Button ref={ref} type="text" size="small" {...buttonProps} className={styles.rowActionButton}>
      {children}
    </Button>
  );
});

function resolveActionValue<T, V>(value: V | ((record: T) => V), record: T): V {
  return typeof value === "function" ? (value as (current: T) => V)(record) : value;
}

function getMenuItemClassName(intent: RowActionIntent | undefined) {
  return clsx({
    [styles.menuItemDanger]: intent === "danger",
    [styles.menuItemWarning]: intent === "warning",
    [styles.menuItemSuccess]: intent === "success",
  });
}

function renderActionLabel<T>(action: RowAction<T>, record: T) {
  return resolveActionValue(action.label, record);
}

function renderTooltip<T>(action: RowAction<T>, record: T, node: ReactNode) {
  const content = action.tooltip ? resolveActionValue(action.tooltip, record) : undefined;
  return content ? (
    <Tooltip content={content}>
      <span className={styles.actionTooltipTrigger}>{node}</span>
    </Tooltip>
  ) : (
    node
  );
}

export function ConfiguredDataTableRowActions<T>({
  actions,
  record,
}: ConfiguredDataTableRowActionsProps<T>) {
  const visibleActions = actions.filter((action) => action.visible?.(record) !== false);
  const menu = visibleActions.length ? (
    <Menu
      className={styles.semanticMenu}
      onClickMenuItem={(key) => {
        const action = visibleActions.find((item) => item.key === key);
        if (action) action.onClick(record);
      }}
    >
      {visibleActions.map((action) => (
        <Menu.Item
          key={action.key}
          disabled={action.disabled?.(record) || action.loading?.(record)}
          className={getMenuItemClassName(action.intent)}
        >
          {renderTooltip(action, record, renderActionLabel(action, record))}
        </Menu.Item>
      ))}
    </Menu>
  ) : null;

  if (!menu) return "-";

  return (
    <DataTableRowActions>
      <Dropdown droplist={menu} trigger="click" position="br">
        <DataTableRowActionButton aria-label={MORE_ACTIONS_LABEL} title={MORE_ACTIONS_LABEL}>
          <IconMoreVertical />
        </DataTableRowActionButton>
      </Dropdown>
    </DataTableRowActions>
  );
}
