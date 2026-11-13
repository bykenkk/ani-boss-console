const unitLabels: Record<string, string> = { core: "核", gpu: "张" };

export function formatQuotaValue(value?: string, unit?: string): string {
  if (value === undefined || value === "") return "-";
  return unit ? `${value} ${unitLabels[unit] ?? unit}` : value;
}
