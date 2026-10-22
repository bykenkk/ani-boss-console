import { Input } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { listQuotaDefinitionOptions, planKeys } from "@/api/plans";

interface QuotaValueInputProps {
  quotaCode?: string;
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export function QuotaValueInput({ quotaCode, value, onChange, disabled }: QuotaValueInputProps) {
  const catalog = useQuery({
    queryKey: planKeys.quotaDefinitions,
    queryFn: ({ signal }) => listQuotaDefinitionOptions({}, signal),
    meta: {
      errorNotification: { id: "quota-definitions", action: "配额目录加载" },
    },
  });
  const unit = catalog.data?.items?.find((item) => item.code === quotaCode)?.unit;

  return (
    <Input
      aria-label="配额值"
      value={value}
      onChange={onChange}
      disabled={disabled}
      suffix={unit}
    />
  );
}
