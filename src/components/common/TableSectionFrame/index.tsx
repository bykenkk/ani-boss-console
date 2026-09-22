import { cloneElement, type ReactElement, type ReactNode } from "react";
import type { ListDataTableProps } from "../ListDataTable";
import { ListToolbar, ToolbarIconButton, ToolbarSearch } from "../ListPageFrame/ListToolbar";
import { StatusTabs } from "../ListPageFrame/StatusTabs";
import type { ListPageTabsConfig, ListPageToolbarConfig } from "../ListPageFrame/types";
import styles from "./index.module.less";

interface TableSectionFrameProps<
  T,
  TStatus extends string = string,
  TSearchField extends string = string,
> {
  header?: ReactNode;
  tabs?: ListPageTabsConfig<TStatus>;
  toolbar?: ListPageToolbarConfig<TSearchField>;
  children: ReactElement<ListDataTableProps<T>>;
}

export function TableSectionFrame<
  T,
  TStatus extends string = string,
  TSearchField extends string = string,
>({ header, tabs, toolbar, children }: TableSectionFrameProps<T, TStatus, TSearchField>) {
  const tableScroll = children.props.scroll;
  const contentHeightTable = cloneElement(children, {
    scroll: {
      ...tableScroll,
      y: tableScroll?.y ?? false,
    },
  });
  const toolbarFilters =
    toolbar?.search || toolbar?.filters ? (
      <>
        {toolbar.search ? <ToolbarSearch {...toolbar.search} /> : null}
        {toolbar.filters}
      </>
    ) : undefined;
  const toolbarTools =
    toolbar?.tools || toolbar?.refresh ? (
      <>
        {toolbar.tools}
        {toolbar.refresh ? (
          <ToolbarIconButton
            iconClassName="icon-refresh-1"
            label={toolbar.refresh.label ?? "刷新"}
            spinning={toolbar.refresh.spinning}
            disabled={toolbar.refresh.disabled}
            onClick={toolbar.refresh.onClick}
          />
        ) : null}
      </>
    ) : undefined;

  return (
    <section className={styles.frame}>
      {header}
      <div className={styles.content}>
        {tabs ? <StatusTabs {...tabs} /> : null}
        {toolbar ? (
          <ListToolbar actions={toolbar.actions} filters={toolbarFilters} tools={toolbarTools} />
        ) : null}
        <div className={styles.tableSlot}>{contentHeightTable}</div>
      </div>
    </section>
  );
}
