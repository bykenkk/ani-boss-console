import { useState } from "react";
import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listPlanOptions, planKeys } from "@/api/plans";
import { withId } from "@/lib/id";

interface PlanSelectProps {
  value?: number;
  onChange?: (value: number | undefined) => void;
  disabled?: boolean;
}

export function PlanSelect({ value, onChange, disabled }: PlanSelectProps) {
  const [search, setSearch] = useState("");
  const input = { search };
  const query = useQuery({
    queryKey: planKeys.options(input),
    queryFn: ({ signal }) => listPlanOptions(input, signal),
    meta: {
      errorNotification: { id: withId("management-options", "plans"), action: "关联选项加载" },
    },
  });
  const options = (query.data?.items ?? []).map((item) => ({
    value: item.id,
    label: `${item.name ?? item.id}`,
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
