import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listManagementOptions, managementKeys } from "@/api/management";
import { withId } from "@/lib/id";

interface Props {
  value?: number;
  onChange?: (value: number | undefined) => void;
  disabled?: boolean;
  excludeSubtreeId?: number;
  includeRoot?: boolean;
}

export function PermissionGroupSelect({
  value,
  onChange,
  disabled,
  excludeSubtreeId,
  includeRoot,
}: Props) {
  const [search, setSearch] = useState("");
  const filters = {
    ...(excludeSubtreeId !== undefined ? { exclude_subtree: excludeSubtreeId } : {}),
    ...(search ? { name__contains: search } : {}),
  };
  const query = useQuery({
    queryKey: managementKeys.list("permission-groups", { noPaging: true, filters }),
    queryFn: ({ signal }) => listManagementOptions("permission-groups", filters, signal),
    meta: {
      errorNotification: {
        id: withId("management-options", "permission-groups"),
        action: "关联选项加载",
      },
    },
  });
  const options = (query.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name ?? item.code ?? item.id}`,
  }));
  if (includeRoot) options.unshift({ value: 0, label: "无上级分组" });
  return (
    <Select
      aria-label="权限分组"
      showSearch
      filterOption={false}
      onSearch={setSearch}
      allowClear
      value={value}
      onChange={onChange}
      options={options}
      loading={query.isFetching}
      disabled={disabled || query.isError}
      placeholder="请选择"
    />
  );
}
