import { Empty } from "@arco-design/web-react";
import clsx from "clsx";
import { DataTable, type DataTableProps } from "../DataTable";
import styles from "./index.module.less";

export type ListDataTableProps<T> = Omit<DataTableProps<T>, "className" | "noDataElement"> & {
  className?: string;
  emptyText?: string;
  preserveTableOnEmpty?: boolean;
};

const DEFAULT_NAME_COLUMN_WIDTH = 200;

export function ListDataTable<T>({
  className,
  emptyText,
  preserveTableOnEmpty: _preserveTableOnEmpty,
  scroll,
  ...tableProps
}: ListDataTableProps<T>) {
  const columns = tableProps.columns.map((column) => {
    const fixedColumn =
      column.key === "name"
        ? {
            ...column,
            fixed: column.fixed ?? ("left" as const),
            width: column.width ?? DEFAULT_NAME_COLUMN_WIDTH,
          }
        : column;
    return fixedColumn;
  });

  return (
    <DataTable
      {...tableProps}
      columns={columns}
      className={clsx(styles.listDataTable, className)}
      scroll={{ ...scroll, y: scroll?.y ?? true }}
      noDataElement={emptyText === undefined ? undefined : <Empty description={emptyText} />}
    />
  );
}
