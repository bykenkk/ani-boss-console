import { Button, Input, Select, Space, type ButtonProps } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { forwardRef, type ReactNode } from "react";
import styles from "./index.module.less";

export type ListToolbarProps = { actions?: ReactNode; filters?: ReactNode; tools?: ReactNode };

export function ListToolbar({ actions, filters, tools }: ListToolbarProps) {
  return (
    <div className={styles.toolbar}>
      {actions ? <div className={styles.toolbarActions}>{actions}</div> : null}
      {filters ? <Space className={styles.toolbarFilters}>{filters}</Space> : null}
      {tools ? <div className={styles.toolbarTools}>{tools}</div> : null}
    </div>
  );
}

type ToolbarIconButtonProps = Omit<ButtonProps, "icon" | "loading"> & {
  label: string;
  spinning?: boolean;
};

export const ToolbarIconButton = forwardRef<HTMLButtonElement, ToolbarIconButtonProps>(
  function ToolbarIconButton({ label, spinning = false, ...buttonProps }, ref) {
    return (
      <Button
        ref={ref}
        icon={<IconRefresh spin={spinning} />}
        aria-label={label}
        title={label}
        {...buttonProps}
      />
    );
  },
);

export type SearchField<T extends string> = { value: T; label: string };

type ToolbarSearchProps<T extends string> = {
  fields: Array<SearchField<T>>;
  field: T;
  value: string;
  placeholder?: string;
  onFieldChange: (field: T) => void;
  onChange: (value: string) => void;
};

export function ToolbarSearch<T extends string>({
  fields,
  field,
  value,
  placeholder = "请输入搜索内容",
  onFieldChange,
  onChange,
}: ToolbarSearchProps<T>) {
  return (
    <Space>
      <Select aria-label="搜索字段" value={field} onChange={onFieldChange} options={fields} />
      <Input.Search
        aria-label="搜索内容"
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        allowClear
      />
    </Space>
  );
}
