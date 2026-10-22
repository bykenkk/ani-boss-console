import { Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listQuotaDefinitionOptions, planKeys } from "@/api/plans";

interface QuotaCodeSelectProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
  disabled?: boolean;
}

export function QuotaCodeSelect({ value, onChange, disabled }: QuotaCodeSelectProps) {
  const catalog = useQuery({
    queryKey: planKeys.quotaDefinitions,
    queryFn: ({ signal }) => listQuotaDefinitionOptions({}, signal),
    meta: {
      errorNotification: { id: "quota-definitions", action: "配额目录加载" },
    },
  });
  const definitions = catalog.data?.items ?? [];
  const options = definitions.map((definition) => ({
    value: definition.code ?? "",
    label: definition.displayName
      ? `${definition.displayName}（${definition.code}）`
      : (definition.code ?? "-"),
    disabled: !definition.code,
  }));
  if (value && !definitions.some((definition) => definition.code === value)) {
    options.unshift({ value, label: `${value}（当前值）`, disabled: true });
  }

  return (
    <Select
      aria-label="配额类型"
      value={value}
      onChange={onChange}
      options={options}
      loading={catalog.isFetching}
      disabled={disabled || catalog.isPending || catalog.isError || definitions.length === 0}
      filterOption={false}
      placeholder="请选择配额类型"
      notFoundContent="暂无已登记的配额"
    />
  );
}
