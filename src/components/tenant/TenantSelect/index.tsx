import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listManagementOptions, managementKeys } from "@/api/management";
import { withId } from "@/lib/id";

interface Props {
  value?: number;
  onChange?: (value: number | undefined) => void;
  disabled?: boolean;
  includePlatform?: boolean;
}

export function TenantSelect({ value, onChange, disabled, includePlatform }: Props) {
  const [search, setSearch] = useState("");
  const filters = { ...(search ? { name__contains: search } : {}) };
  const query = useQuery({
    queryKey: managementKeys.list("tenants", { noPaging: true, filters }),
    queryFn: ({ signal }) => listManagementOptions("tenants", filters, signal),
    meta: {
      errorNotification: { id: withId("management-options", "tenants"), action: "关联选项加载" },
    },
  });
  const options = (query.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name ?? item.code ?? item.id}`,
  }));
  if (includePlatform) options.unshift({ value: 0, label: "平台（全局）" });
  return (
    <Select
      aria-label="租户"
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
