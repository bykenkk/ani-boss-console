import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listManagementOptions, managementKeys } from "@/api/management";
import { withId } from "@/lib/id";

interface Props {
  value?: number | number[];
  onChange?: (value: number | number[] | undefined) => void;
  disabled?: boolean;
  multiple?: boolean;
  tenantId?: number;
}

export function RoleSelect({ value, onChange, multiple, tenantId, disabled }: Props) {
  const [search, setSearch] = useState("");
  const filters = {
    ...(tenantId !== undefined
      ? { tenant_id: tenantId, type: tenantId ? "TENANT" : "SYSTEM" }
      : {}),
    ...(search ? { name__contains: search } : {}),
  };
  const query = useQuery({
    queryKey: managementKeys.list("roles", { noPaging: true, filters }),
    queryFn: ({ signal }) => listManagementOptions("roles", filters, signal),
    meta: {
      errorNotification: { id: withId("management-options", "roles"), action: "关联选项加载" },
    },
  });
  const options = (query.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name ?? item.code ?? item.id}${item.tenantName ? ` · ${item.tenantName}` : ""}`,
  }));

  return (
    <Select
      aria-label="角色"
      showSearch
      filterOption={false}
      onSearch={setSearch}
      allowClear
      mode={multiple ? "multiple" : undefined}
      value={value}
      onChange={onChange}
      options={options}
      loading={query.isFetching}
      disabled={disabled || query.isError}
      placeholder="请选择"
      maxTagCount={3}
    />
  );
}
