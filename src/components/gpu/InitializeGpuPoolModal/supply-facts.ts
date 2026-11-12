import type {
  GpuAllocationType,
  GpuBaseline,
  GpuDiscoveredNode,
  GpuProviderConfig,
  GpuRegisteredSupplyConfiguration,
  GpuResourceTypeConfig,
  GpuSupplyCandidate,
  GpuSupplyCandidates,
} from "@/api/accelerator";
import { fixedPartitionMemoryMib } from "../initialization";

export interface GpuInitializationSupplyFacts {
  identity: {
    providerConfigRef?: string;
    adapterId?: string;
    allocationType?: GpuAllocationType;
    availableAllocationTypes: GpuAllocationType[];
    modelKeys: string[];
  };
  nodes: GpuDiscoveredNode[];
  source: "registration" | "observation" | "unavailable";
  loading: boolean;
  error?: Error;
  issues: string[];
  notes: string[];
  hasMore: boolean;
  resourceOptions: Array<{ key: string; label: string }>;
  resourceKey?: string;
  fixed?: {
    bytes: string;
    memoryMiB: string;
    computeUnits: number;
    source: "registration" | "observation";
  };
  registered?: { baseline: GpuBaseline; resourceType: GpuResourceTypeConfig };
  observed?: {
    memoryBlockMiB?: number;
    splitCount?: number;
    coreBudgetAdditive?: boolean;
    maxMemoryMiBPerDevice?: string;
    runtimeClassName?: string;
  };
  protocol: {
    resourceKey?: string;
    memoryMiBPerDevice?: string;
    computeUnitsPerDevice: number;
    coreLimitPercent?: number;
  };
  ready: boolean;
}

interface ResolveSupplyFactsInput {
  nodes: GpuDiscoveredNode[];
  config?: GpuProviderConfig;
  allocationType?: GpuAllocationType;
  selectedResourceKey: string;
  registration?: GpuRegisteredSupplyConfiguration;
  candidatePages?: GpuSupplyCandidates[];
  loading: boolean;
  error?: Error;
}

function consistent<T>(values: Array<T | null | undefined>): T | undefined {
  const first = values[0];
  return first != null && values.every((value) => Object.is(value, first)) ? first : undefined;
}

function fixedFacts(bytes: string | null | undefined, computeUnits: number | null | undefined) {
  const memoryMiB = bytes == null ? undefined : fixedPartitionMemoryMib(bytes);
  return memoryMiB && computeUnits != null && Number.isInteger(computeUnits) && computeUnits > 0
    ? { bytes: bytes!, memoryMiB, computeUnits }
    : undefined;
}

// Catalog approval and current observations are separate sources. A candidate
// does not identify an old provider_config_ref or disclose its approved policy.
export function resolveGpuInitializationSupply(
  input: ResolveSupplyFactsInput,
): GpuInitializationSupplyFacts {
  const { nodes, config, allocationType, selectedResourceKey } = input;
  const registration =
    input.registration?.provider_config_ref === config?.provider_config_ref &&
    input.registration?.baseline.adapter_id === config?.adapter_id
      ? input.registration
      : undefined;
  const approvedTypes = registration?.baseline.resource_types.filter(
    (type) => type.allocation_type === allocationType,
  );
  const pages = input.candidatePages ?? [];
  const loadedCandidates = pages.flatMap((page) => page.items);
  const candidates = !input.error ? loadedCandidates : [];
  const hasMore = !registration && Number(pages[0]?.total ?? "0") > loadedCandidates.length;
  const perNode = nodes.map((node) =>
    candidates.filter(
      (candidate) =>
        candidate.node.uid === node.node?.uid &&
        (config?.adapter_id !== "volcano-hami-mib-v1" || candidate.node.name === node.node?.name) &&
        candidate.adapter_id === config?.adapter_id &&
        candidate.allocation_type === allocationType &&
        !candidate.blocking_reasons.length &&
        candidate.resource_key !== "",
    ),
  );
  const commonKeys =
    perNode.length && perNode.every((items) => items.length)
      ? [...new Set(perNode[0].map((candidate) => candidate.resource_key))].filter((key) =>
          perNode.every((items) => items.some((candidate) => candidate.resource_key === key)),
        )
      : [];
  const keys = approvedTypes
    ? [...new Set(approvedTypes.map((type) => type.resource_key))]
    : commonKeys;
  const resourceKey = hasMore
    ? undefined
    : keys.includes(selectedResourceKey)
      ? selectedResourceKey
      : keys.length === 1
        ? keys[0]
        : undefined;
  const approvedType = approvedTypes?.find((type) => type.resource_key === resourceKey);
  const selectedCandidates: GpuSupplyCandidate[] = resourceKey
    ? perNode.flatMap((items) =>
        items.filter((candidate) => candidate.resource_key === resourceKey),
      )
    : [];
  const observed =
    selectedCandidates.length &&
    perNode.every((items) => items.some((candidate) => candidate.resource_key === resourceKey))
      ? {
          memoryBlockMiB: consistent(
            selectedCandidates.map((candidate) => candidate.memory_block_mib),
          ),
          splitCount: consistent(selectedCandidates.map((candidate) => candidate.split_count)),
          coreBudgetAdditive: consistent(
            selectedCandidates.map((candidate) => candidate.core_budget_additive),
          ),
          maxMemoryMiBPerDevice: consistent(
            selectedCandidates.map((candidate) => candidate.max_memory_mib_per_device),
          ),
          runtimeClassName: consistent(
            selectedCandidates.map((candidate) => candidate.runtime_class_name),
          ),
        }
      : undefined;
  const approvedFixed =
    allocationType === "FIXED_PARTITION" && approvedType
      ? fixedFacts(approvedType.memory_capacity_bytes, approvedType.compute_units_per_device)
      : undefined;
  const currentFixed =
    allocationType === "FIXED_PARTITION" && selectedCandidates.length && observed
      ? fixedFacts(
          consistent(selectedCandidates.map((candidate) => candidate.memory_capacity_bytes)),
          consistent(selectedCandidates.map((candidate) => candidate.compute_units_per_device)),
        )
      : undefined;
  const fixed = approvedFixed
    ? { ...approvedFixed, source: "registration" as const }
    : currentFixed
      ? { ...currentFixed, source: "observation" as const }
      : undefined;
  const issues: string[] = [];
  const nvidia = config?.adapter_id === "volcano-hami-mib-v1";
  const hygon = config?.adapter_id === "hygon-hcu-v1";
  if (config && allocationType && hasMore)
    issues.push("供给记录尚未查询完整，请继续查询后确认所选节点的资源类型和固定片事实。");
  if (config && !nvidia && !hygon) issues.push("当前引导暂不支持此设备适配器。");
  if (config && allocationType && !resourceKey && !hasMore) {
    issues.push(
      keys.length > 1
        ? "请选择一种已返回的资源类型。"
        : input.loading
          ? "正在查询资源类型。"
          : input.error
            ? "供给事实查询失败，请重新查询。"
            : "接口尚未返回所选节点共同支持的资源类型，请重新查询供给。",
    );
  }
  if (allocationType === "FIXED_PARTITION" && resourceKey && !fixed) {
    issues.push("尚未取得该固定片类型一致的显存和 CU，请在查询登记中核实设备事实。");
  }
  const approvedMemory = approvedType?.max_memory_mib_per_device;
  const approvedWholeMemory =
    nvidia && allocationType === "PHYSICAL" && approvedMemory && /^[1-9]\d*$/.test(approvedMemory)
      ? approvedMemory
      : undefined;
  if (nvidia && allocationType === "PHYSICAL" && !approvedWholeMemory) {
    issues.push(
      "所选供给未返回已批准的整卡显存预算，请通过查询登记取得登记收据；当前设备总量不能替代已批准预算。",
    );
  }
  const notes: string[] = [];
  if (config && !registration)
    notes.push(
      "当前设备事实来自供给查询，运行时和登记上限仍由已登记配置执行；未返回的登记详情显示为未知。",
    );
  const loading = !registration && input.loading;
  const error = !registration ? input.error : undefined;
  const protocol = {
    resourceKey,
    memoryMiBPerDevice:
      hygon && allocationType === "PHYSICAL" ? "0" : (fixed?.memoryMiB ?? approvedWholeMemory),
    computeUnitsPerDevice: fixed?.computeUnits ?? 0,
    coreLimitPercent: hygon ? 0 : nvidia && allocationType === "PHYSICAL" ? 100 : undefined,
  };
  return {
    identity: {
      providerConfigRef: config?.provider_config_ref,
      adapterId: config?.adapter_id,
      allocationType,
      availableAllocationTypes: (config?.allocation_types ?? []).filter((type) =>
        hygon
          ? type === "PHYSICAL" || type === "FIXED_PARTITION"
          : nvidia && (type === "PHYSICAL" || type === "DYNAMIC_SHARED"),
      ),
      modelKeys: registration
        ? [registration.model_key]
        : [
            ...new Set(
              selectedCandidates.some((candidate) => candidate.model_key)
                ? selectedCandidates.flatMap((candidate) =>
                    candidate.model_key ? [candidate.model_key] : [],
                  )
                : nodes.flatMap(
                    (node) =>
                      node.devices?.flatMap((device) =>
                        device.model_key ? [device.model_key] : [],
                      ) ?? [],
                  ),
            ),
          ],
    },
    nodes,
    source: registration ? "registration" : resourceKey ? "observation" : "unavailable",
    loading,
    error,
    issues,
    notes,
    hasMore,
    resourceOptions: hasMore ? [] : keys.map((key) => ({ key, label: key })),
    resourceKey,
    fixed,
    registered:
      registration && approvedType
        ? { baseline: registration.baseline, resourceType: approvedType }
        : undefined,
    observed,
    protocol,
    ready: Boolean(
      config &&
      allocationType &&
      nodes.length &&
      resourceKey &&
      !issues.length &&
      !loading &&
      !error,
    ),
  };
}
