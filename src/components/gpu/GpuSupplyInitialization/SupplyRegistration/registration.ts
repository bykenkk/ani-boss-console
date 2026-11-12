import type {
  RegisterSupplyConfigurationInput,
  SupplyCandidate,
  SupplyDeclaration,
} from "@/api/accelerator/types-group-policy";

export const supplyDeclarationLabels: Record<string, string> = {
  memory_block_mib: "插件显存单位 MiB/块",
  split_count: "单卡实际注册槽数 K",
  max_memory_mib_per_device: "单卡有效显存预算 MiB",
  model_key: "型号标识",
  memory_capacity_bytes: "原生每片实际显存 bytes",
  compute_units_per_device: "原生每片计算单元 CU",
  runtime_class_name: "运行时名称",
};
const pluginFields = ["memory_block_mib", "split_count", "max_memory_mib_per_device"] as const;
export function requiredSupplyDeclarationFields(candidates: SupplyCandidate[]) {
  // Declare only absent facts required by the selected source contract. Known
  // zero stays known; legacy budget declarations do not gate new supply.
  const required = new Set<string>();
  for (const candidate of candidates) {
    if (!candidate.model_key?.trim()) required.add("model_key");
    if (candidate.source_kind === "PLUGIN") {
      for (const field of pluginFields) {
        if (candidate[field] == null) required.add(field);
      }
    } else if (candidate.source_kind === "NATIVE_FIXED_PARTITION") {
      if (candidate.memory_capacity_bytes == null) required.add("memory_capacity_bytes");
      if (candidate.compute_units_per_device == null) required.add("compute_units_per_device");
    }
  }
  return Object.keys(supplyDeclarationLabels).filter((field) => required.has(field));
}
export function commonSupplyRuntimes(candidates: SupplyCandidate[]): string[] {
  if (!candidates.length) return [];
  const choices = candidates.map((candidate) =>
    candidate.runtime_class_name != null
      ? [candidate.runtime_class_name]
      : (candidate.runtime_class_candidates ?? []),
  );
  return [...new Set(choices[0])]
    .filter((runtime) => Boolean(runtime) && choices.every((options) => options.includes(runtime)))
    .sort();
}
export interface SupplyRegistrationFormInput {
  connectionRef: string;
  discoveryRevision: string;
  selected: SupplyCandidate[];
  name: string;
  runtime: string;
  maxDevices: number;
  declarations: SupplyDeclaration[];
  mappingConfirmed: boolean;
  mappingSource: string;
}
export function supplyRegistrationProblems(input: SupplyRegistrationFormInput): string[] {
  const problems: string[] = [];
  if (!input.selected.length) problems.push("请选择供给候选");
  if (!input.name.trim() || [...input.name.trim()].length > 64)
    problems.push("登记名称须为 1 至 64 个字符");
  if (!input.discoveryRevision) problems.push("请先读取当前供给发现版本");
  const plugin = input.selected[0]?.source_kind === "PLUGIN";
  if (input.selected.some((candidate) => candidate.source_kind !== input.selected[0]?.source_kind))
    problems.push("不同来源类型请分别登记");
  if (plugin && !input.runtime) problems.push("请选择所选节点共同可用的运行时");
  if (input.runtime && !commonSupplyRuntimes(input.selected).includes(input.runtime))
    problems.push("运行时须在所有所选节点的已发现候选中可用");
  if (
    !Number.isInteger(input.maxDevices) ||
    input.maxDevices < 1 ||
    input.maxDevices > (plugin ? 2147483647 : 4294967295)
  )
    problems.push("设备数上限无效");
  for (const candidate of input.selected) {
    if (candidate.blocking_reasons?.length)
      problems.push(`${candidate.node.name} 存在供给阻塞项，请核实后重新查询`);
    if (candidate.source_kind === "NATIVE_FIXED_PARTITION") {
      if (
        candidate.memory_capacity_bytes != null &&
        !/^[1-9]\d*$/.test(candidate.memory_capacity_bytes)
      )
        problems.push("已知固定切片显存必须为正整数，不能用声明覆盖已知事实");
      if (
        candidate.compute_units_per_device != null &&
        (!Number.isInteger(candidate.compute_units_per_device) ||
          candidate.compute_units_per_device < 1)
      )
        problems.push("已知固定切片 CU 必须为正整数，不能用声明覆盖已知事实");
    }
  }
  const required = requiredSupplyDeclarationFields(input.selected);
  for (const field of required) {
    const declaration = input.declarations.find((row) => row.field === field);
    if (!declaration?.value.trim() || !declaration.source.trim())
      problems.push(`请补充 ${supplyDeclarationLabels[field]}（${field}）的值及来源`);
  }
  const fields = new Set<string>();
  if (input.declarations.length > 8) problems.push("每项登记最多 8 项声明");
  for (const row of input.declarations) {
    const field = row.field.trim();
    const value = row.value.trim();
    if (!supplyDeclarationLabels[field] || fields.has(field) || !value || !row.source.trim())
      problems.push("声明字段不可重复，值及来源必须填写");
    fields.add(field);
    if (field === "core_budget_additive")
      problems.push("core_budget_additive 仅保留历史兼容，新登记请移除此声明");
    if (field === "memory_block_mib" && value !== "1" && value !== "10")
      problems.push("当前插件显存单位仅支持 1 或 10 MiB/块");
    if (
      (field === "split_count" || field === "max_memory_mib_per_device") &&
      (!/^\d+$/.test(value) || BigInt(value) < 1n || BigInt(value) > 2147483647n)
    )
      problems.push(`${supplyDeclarationLabels[field]}须为 1 至 2147483647 的整数`);
  }
  if (
    input.selected.some((candidate) => candidate.resource_mapping_required) &&
    (!input.mappingConfirmed || !input.mappingSource.trim())
  )
    problems.push("请确认资源键映射并填写来源");
  return [...new Set(problems)];
}
export function buildSupplyRegistrationInput(
  input: SupplyRegistrationFormInput,
): RegisterSupplyConfigurationInput {
  const problem = supplyRegistrationProblems(input)[0];
  if (problem) throw new Error(problem);
  const plugin = input.selected[0].source_kind === "PLUGIN";
  const fixed = input.selected[0].source_kind === "NATIVE_FIXED_PARTITION";
  const mapping = input.selected.some((candidate) => candidate.resource_mapping_required);
  return {
    connection_ref: input.connectionRef,
    discovery_revision: input.discoveryRevision,
    registrations: [
      {
        client_key: "supply",
        display_name: input.name.trim(),
        candidate_ids: input.selected.map((candidate) => candidate.candidate_id),
        ...(input.runtime ? { runtime_class_name: input.runtime } : {}),
        ...(plugin
          ? { whole_max_devices_per_replica: input.maxDevices }
          : { max_devices_per_replica: fixed ? 1 : input.maxDevices }),
        ...(input.declarations.length
          ? {
              declarations: input.declarations.map((row) => ({
                field: row.field.trim(),
                value: row.value.trim(),
                source: row.source.trim(),
              })),
            }
          : {}),
        ...(mapping
          ? {
              resource_mapping_confirmed: input.mappingConfirmed,
              resource_mapping_source: input.mappingSource.trim(),
            }
          : {}),
      },
    ],
  };
}
