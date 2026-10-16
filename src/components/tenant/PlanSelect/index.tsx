import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listManagementOptions, managementKeys } from "@/api/management";
import { withId } from "@/lib/id";

interface Props {
  value?: number;
  onChange?: (value: number | undefined) => void;
  disabled?: boolean;
}

export function PlanSelect({ value, onChange, disabled }: Props) {
  const [search, setSearch] = useState("");
  const filters = { ...(search ? { name__contains: search } : {}) };
  const query = useQuery({
    queryKey: managementKeys.list("plans", { noPaging: true, filters }),
    queryFn: ({ signal }) => listManagementOptions("plans", filters, signal),
    meta: {
      errorNotification: { id: withId("management-options", "plans"), action: "关联选项加载" },
    },
  });
  const options = (query.data ?? []).map((item) => ({
    value: item.id,
    label: `${item.name ?? item.code ?? item.id}`,
  }));

  return (
    <Select
      aria-label="套餐"
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
