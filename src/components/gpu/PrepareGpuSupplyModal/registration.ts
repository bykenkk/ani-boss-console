import type {
  GpuSupplyCandidate,
  GpuSupplyDeclaration,
  GpuSupplyDeclarationField,
  GpuSupplyRegistrationInput,
  RegisterGpuSupplyConfigurationInput,
} from "@/api/accelerator/types-supply";
import { formatGpuAllocationType } from "../capacity";

export interface SupplyCandidateDraft {
  mappingConfirmed?: boolean;
  coreBudgetAdditive?: boolean;
  runtimeClassName?: string;
  maxDevicesPerReplica?: number;
  displayName?: string;
}

export const supplyDeclarationFields: ReadonlyArray<{
  field: GpuSupplyDeclarationField;
  label: string;
}> = [
  { field: "model_key", label: "设备型号标识" },
  { field: "memory_capacity_bytes", label: "设备显存容量（Bytes）" },
  { field: "compute_units_per_device", label: "每设备计算单元（CU）" },
  { field: "memory_block_mib", label: "显存单位（MiB）" },
  { field: "split_count", label: "设备分配份数" },
  { field: "core_budget_additive", label: "按总算力预算计算容量" },
  { field: "max_memory_mib_per_device", label: "每设备登记显存（MiB）" },
  { field: "runtime_class_name", label: "运行时类别" },
];

const reasonLabels: Record<string, string> = {
  PROVIDER_CONFIG_REQUIRED: "尚未登记可用供给，请先确认并登记",
  NODE_MODEL_REQUIRED: "尚未取得节点型号，请核实设备观测后重新查询",
  SUPPLY_MODEL_REQUIRED: "尚未取得设备型号，请核实设备观测后重新查询",
  NODE_MODEL_INVALID: "设备型号标识格式不符合要求",
  NODE_MODEL_CONFLICT: "节点标签与设备实际型号不一致",
  NODE_MODEL_AMBIGUOUS: "同一节点发现多个型号，请先核实设备身份",
  NODE_ALREADY_ADOPTED: "节点已经纳入供给组",
  NODE_DELETING: "节点正在删除，暂不可登记",
  NODE_LABEL_CONFLICT: "节点归属标签与平台记录不一致",
  NODE_IDENTITY_CONFLICT: "节点名称或 UID 发生冲突，请重新查询",
  PHYSICAL_DEVICES_PARTITIONED: "物理设备已经切分，请选择已有固定切片",
  NVIDIA_VGPU_RESOURCE_REQUIRED: "当前 NVIDIA 插件未发布所需的 vGPU 资源",
  NVIDIA_UNITS_UNKNOWN: "尚未取得 NVIDIA 插件的实际显存单位和分配份数",
  NVIDIA_UNITS_UNSUPPORTED: "NVIDIA 插件的显存单位或分配份数暂不受支持",
  NVIDIA_MEMORY_BUDGET_AMBIGUOUS: "NVIDIA 设备登记显存存在冲突",
  DEVICE_ID_CONFLICT: "设备身份存在冲突，请先核实原始设备数据",
  PARENT_DEVICE_CONFLICT: "固定切片的父设备身份存在冲突",
  MEMORY_CAPACITY_CONFLICT: "同一设备的真实显存观测值存在冲突",
  COMPUTE_UNITS_CONFLICT: "同一设备的计算单元观测值存在冲突",
  INVENTORY_SCOPE_REQUIRED: "尚未绑定可信设备观测范围，请联系运维",
  INVENTORY_SCOPE_AMBIGUOUS: "连接绑定了多个观测范围，请先核实集群归属",
  INVENTORY_UNAVAILABLE: "暂时无法读取设备观测数据",
  INVENTORY_INCOMPLETE: "设备观测数据尚不完整，请核实采集配置后重新查询",
  FIXED_PARTITION_FACTS_REQUIRED: "固定切片需要真实显存容量和计算单元",
  NVIDIA_PARAMETERS_REQUIRED: "NVIDIA 供给参数尚未补齐",
  RESOURCE_MAPPING_CONFIRMATION_REQUIRED: "请明确确认资源键与实际设备类型的对应关系",
  RUNTIME_CLASS_SOURCE_REQUIRED: "运行时类别没有发现来源，请从实际选项选择或重新查询",
  DISCOVERY_REVISION_CONFLICT: "供给事实已变化，请重新查询并确认",
  SUPPLY_CANDIDATE_CHANGED: "选中的供给候选已变化，请重新查询",
  SUPPLY_CANDIDATE_BLOCKED: "供给候选存在阻塞项，请先处理后重新查询",
  SUPPLY_CANDIDATE_MISMATCH: "所选候选的型号或供给参数不兼容",
  OBSERVED_SUPPLY_FACT_OVERRIDE: "提交值与已获取事实不一致，请重新查询并保留真实事实",
  REGISTERED_RESOURCE_TYPE_CHANGED: "已登记固定切片的实际显存或计算单元已变化",
  REGISTERED_NVIDIA_UNITS_CHANGED: "已登记 NVIDIA 设备的插件参数已变化",
  REGISTERED_MODE_UNVERIFIED: "尚未核实已登记设备的当前模式",
};

export function formatSupplyField(field: string): string {
  return supplyDeclarationFields.find((item) => item.field === field)?.label ?? field;
}

export function formatSupplyReason(reason: string): string {
  return reasonLabels[reason] ?? reason;
}

type Facts = Record<GpuSupplyDeclarationField, string | undefined>;
type Prepared = {
  candidate: GpuSupplyCandidate;
  facts: Facts;
  runtime: string;
  maximum: number;
  displayName: string;
  mappingConfirmed: boolean;
};

function validText(value: string, maximum: number): boolean {
  return Boolean(value.trim()) && [...value].length <= maximum && !/[\0\r\n]/.test(value);
}

function observedFacts(candidate: GpuSupplyCandidate): Facts {
  return {
    model_key: candidate.model_key || undefined,
    memory_capacity_bytes: candidate.memory_capacity_bytes ?? undefined,
    compute_units_per_device:
      candidate.compute_units_per_device == null
        ? undefined
        : String(candidate.compute_units_per_device),
    memory_block_mib:
      candidate.memory_block_mib == null ? undefined : String(candidate.memory_block_mib),
    split_count: candidate.split_count == null ? undefined : String(candidate.split_count),
    core_budget_additive:
      candidate.core_budget_additive == null ? undefined : String(candidate.core_budget_additive),
    max_memory_mib_per_device: candidate.max_memory_mib_per_device ?? undefined,
    runtime_class_name: candidate.runtime_class_name ?? undefined,
  };
}

// Only facts required by this allocation's frozen baseline gate a new
// registration. Physical memory/CU telemetry is informative for whole cards;
// RuntimeClass and an unknown compute-budget policy are separate administrator
// choices. Resolving a policy never supplies missing hardware facts.
export function missingSupplyRegistrationFacts(
  candidate: GpuSupplyCandidate,
  draft: SupplyCandidateDraft = {},
): GpuSupplyDeclarationField[] {
  const required: GpuSupplyDeclarationField[] = ["model_key"];
  if (candidate.allocation_type === "FIXED_PARTITION") {
    required.push("memory_capacity_bytes", "compute_units_per_device");
  }
  if (candidate.adapter_id === "volcano-hami-mib-v1") {
    required.push(
      "memory_block_mib",
      "split_count",
      "core_budget_additive",
      "max_memory_mib_per_device",
    );
  }
  const facts = observedFacts(candidate);
  return required.filter(
    (field) =>
      facts[field] === undefined &&
      !(field === "core_budget_additive" && typeof draft.coreBudgetAdditive === "boolean"),
  );
}

function prepare(candidate: GpuSupplyCandidate, draft: SupplyCandidateDraft): Prepared {
  const node = candidate.node?.name || "所选节点";
  if (
    !candidate.candidate_id ||
    !candidate.node?.uid ||
    !candidate.node.name ||
    !candidate.resource_key
  ) {
    throw new Error("供给候选缺少节点、候选标识或资源键，请重新查询");
  }
  if (candidate.blocking_reasons?.length) {
    throw new Error(`${node}：${candidate.blocking_reasons.map(formatSupplyReason).join("；")}`);
  }
  const facts = observedFacts(candidate);
  if (candidate.adapter_id === "volcano-hami-mib-v1") {
    if (facts.core_budget_additive === undefined) {
      if (typeof draft.coreBudgetAdditive !== "boolean") {
        throw new Error(`请为${node}选择是否按总算力预算计算容量`);
      }
      facts.core_budget_additive = String(draft.coreBudgetAdditive);
    } else if (
      draft.coreBudgetAdditive !== undefined &&
      String(draft.coreBudgetAdditive) !== facts.core_budget_additive
    ) {
      throw new Error(`${node}的算力预算策略与已知配置不一致，请重新查询`);
    }
  }
  const missing = missingSupplyRegistrationFacts(candidate, draft);
  if (missing.length) {
    throw new Error(
      `${node}尚未取得${missing.map(formatSupplyField).join("、")}，请核实设备观测或插件配置后重新查询`,
    );
  }
  const selectedRuntime = draft.runtimeClassName?.trim();
  if (selectedRuntime !== undefined) {
    if (
      selectedRuntime !== "" &&
      (selectedRuntime.length > 63 || !/^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(selectedRuntime))
    ) {
      throw new Error(`${node}的运行时类别格式不正确`);
    }
    if (facts.runtime_class_name !== undefined && facts.runtime_class_name !== selectedRuntime) {
      throw new Error(`${node}的运行时选择与已知事实不一致`);
    }
    if (
      facts.runtime_class_name === undefined &&
      selectedRuntime !== "" &&
      !candidate.runtime_class_candidates.includes(selectedRuntime)
    ) {
      throw new Error(`${node}的运行时类别没有发现来源，请从实际选项选择`);
    }
  }
  const maximum = draft.maxDevicesPerReplica ?? 1;
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > 4294967295) {
    throw new Error("每副本设备上限必须是 1–4294967295 范围内的整数");
  }
  const runtime = facts.runtime_class_name ?? selectedRuntime ?? "";
  if (candidate.adapter_id === "hygon-hcu-v1") {
    if (
      (facts.memory_block_mib ?? "0") !== "0" ||
      (facts.split_count ?? "0") !== "0" ||
      (facts.core_budget_additive ?? "false") !== "false" ||
      (facts.max_memory_mib_per_device ?? "0") !== "0"
    ) {
      throw new Error(`${node}的海光供给不能使用 NVIDIA 分配参数`);
    }
    if (candidate.allocation_type === "FIXED_PARTITION") {
      if (
        !facts.memory_capacity_bytes ||
        BigInt(facts.memory_capacity_bytes) === 0n ||
        !facts.compute_units_per_device ||
        BigInt(facts.compute_units_per_device) === 0n ||
        maximum !== 1
      ) {
        throw new Error(`${node}的固定切片需要真实正显存、CU，且每副本仅允许一片`);
      }
    } else if (candidate.allocation_type !== "PHYSICAL") {
      throw new Error(`${node}的海光供给类型暂不受支持`);
    }
  } else if (candidate.adapter_id === "volcano-hami-mib-v1") {
    if (candidate.resource_key !== "volcano.sh/vgpu-number")
      throw new Error(`${node}缺少 NVIDIA vGPU 资源键`);
    if (
      facts.memory_block_mib === undefined ||
      facts.split_count === undefined ||
      facts.core_budget_additive === undefined ||
      facts.max_memory_mib_per_device === undefined ||
      !runtime
    ) {
      throw new Error(
        candidate.runtime_class_candidates.length
          ? `请为${node}选择实际已发现的运行时`
          : `${node}尚无可选择的运行时，请核实集群运行时配置后重新查询`,
      );
    }
    const factor = BigInt(facts.memory_block_mib);
    const split = BigInt(facts.split_count);
    const memory = BigInt(facts.max_memory_mib_per_device);
    if (
      (factor !== 1n && factor !== 10n) ||
      split < 1n ||
      split > 2147483647n ||
      memory < 1n ||
      memory > 2147483647n ||
      memory % factor !== 0n
    ) {
      throw new Error(`${node}的 NVIDIA 显存单位、分配份数或登记显存不符合供给合同`);
    }
    if (
      (candidate.allocation_type === "PHYSICAL" && split !== 1n) ||
      (candidate.allocation_type === "DYNAMIC_SHARED" && (split < 2n || maximum !== 1)) ||
      !["PHYSICAL", "DYNAMIC_SHARED"].includes(candidate.allocation_type)
    ) {
      throw new Error(`${node}的 NVIDIA 分配模式与实际插件份数或设备上限不一致`);
    }
  } else {
    throw new Error(`${node}的设备适配器暂不受支持`);
  }
  const mappingConfirmed = candidate.resource_mapping_required && draft.mappingConfirmed === true;
  if (candidate.resource_mapping_required && !mappingConfirmed)
    throw new Error(`请确认${node}资源键与实际设备类型的对应关系`);
  const displayName = draft.displayName?.trim() ?? "";
  if (displayName && !validText(displayName, 64))
    throw new Error("供给名称应为不超过 64 字的单行文本");
  return {
    candidate,
    facts,
    runtime,
    maximum,
    displayName,
    mappingConfirmed,
  };
}

function supplyDisplayName(entry: Prepared): string {
  return (
    entry.displayName ||
    Array.from(
      `${entry.facts.model_key} ${formatGpuAllocationType(entry.candidate.allocation_type)}供给`,
    )
      .slice(0, 64)
      .join("")
  );
}

// One backend registration freezes one baseline. Group by its effective fields, not inapplicable physical
// bytes/CU, node identity or provenance.
export function buildSupplyRegistrationInput(
  connectionRef: string,
  revision: string,
  candidates: GpuSupplyCandidate[],
  drafts: Record<string, SupplyCandidateDraft>,
): RegisterGpuSupplyConfigurationInput {
  if (!connectionRef || !revision) throw new Error("缺少受管连接或发现版本，请重新查询供给");
  if (!candidates.length) throw new Error("请至少选择一个供给候选");
  if (candidates.length > 1024) throw new Error("单次登记最多选择 1024 个候选");
  const ids = new Set<string>();
  const nodes = new Map<string, { name: string; model: string }>();
  const nodeNames = new Map<string, string>();
  const groups = new Map<string, Prepared[]>();
  for (const candidate of [...candidates].sort((a, b) =>
    a.candidate_id.localeCompare(b.candidate_id),
  )) {
    if (ids.has(candidate.candidate_id)) throw new Error("同一供给候选不能重复登记");
    ids.add(candidate.candidate_id);
    const entry = prepare(candidate, drafts[candidate.candidate_id] ?? {});
    const prior = nodes.get(candidate.node.uid);
    if (prior && (prior.name !== candidate.node.name || prior.model !== entry.facts.model_key)) {
      throw new Error("同一节点 UID 的名称或型号不一致，请重新查询并核实");
    }
    const priorUid = nodeNames.get(candidate.node.name);
    if (priorUid && priorUid !== candidate.node.uid) {
      throw new Error("同一节点名称对应多个 UID，请重新查询并核实");
    }
    nodes.set(candidate.node.uid, { name: candidate.node.name, model: entry.facts.model_key! });
    nodeNames.set(candidate.node.name, candidate.node.uid);
    const signature = JSON.stringify([
      candidate.adapter_id,
      candidate.allocation_type,
      candidate.resource_key,
      entry.facts.model_key,
      entry.runtime,
      entry.facts.memory_block_mib ?? "0",
      entry.facts.split_count ?? "0",
      entry.facts.core_budget_additive ?? "false",
      candidate.allocation_type === "FIXED_PARTITION" ? entry.facts.memory_capacity_bytes : "0",
      candidate.allocation_type === "FIXED_PARTITION" ? entry.facts.compute_units_per_device : "0",
      candidate.adapter_id === "volcano-hami-mib-v1" ? entry.facts.max_memory_mib_per_device : "0",
      entry.maximum,
      supplyDisplayName(entry),
    ]);
    const group = groups.get(signature) ?? [];
    group.push(entry);
    groups.set(signature, group);
  }
  if (groups.size > 32) throw new Error("所选候选需要超过 32 组供给登记，请分批选择");
  const registrations: GpuSupplyRegistrationInput[] = [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, group], index) => {
      const first = group[0];
      const mappingConfirmed = group.some((entry) => entry.mappingConfirmed);
      // This records the actual confirmation action and snapshot. It does not
      // claim that a device/plugin file was independently reviewed by the UI.
      const mappingSource = mappingConfirmed
        ? `BOSS供给登记中管理员确认所选候选资源对应关系；发现版本=${revision}`
        : "";
      if (mappingSource && !validText(mappingSource, 512)) {
        throw new Error("资源对应关系的确认记录无效，请重新查询供给");
      }
      const declarations: GpuSupplyDeclaration[] = [];
      if (
        group.some(
          (entry) =>
            entry.candidate.adapter_id === "volcano-hami-mib-v1" &&
            entry.candidate.core_budget_additive == null,
        )
      ) {
        const policySource = `BOSS供给登记中管理员选择按总算力预算计算容量=${first.facts.core_budget_additive}；发现版本=${revision}`;
        if (!validText(policySource, 512)) {
          throw new Error("算力预算策略的选择记录无效，请重新查询供给");
        }
        declarations.push({
          field: "core_budget_additive",
          value: first.facts.core_budget_additive!,
          source: policySource,
        });
      }
      return {
        client_key: `supply_${index + 1}`,
        candidate_ids: group.map((entry) => entry.candidate.candidate_id),
        display_name: supplyDisplayName(first),
        max_devices_per_replica: first.maximum,
        runtime_class_name: first.runtime,
        declarations,
        resource_mapping_confirmed: mappingConfirmed,
        resource_mapping_source: mappingSource,
      };
    });
  return { connection_ref: connectionRef, discovery_revision: revision, registrations };
}
