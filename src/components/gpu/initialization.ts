import type { GpuDiscoveredNode, GpuProviderConfig } from "@/api/accelerator";
import type { StatusBadgeTone } from "@/components/common";

export function commonGpuProviderConfigs(nodes: GpuDiscoveredNode[]): GpuProviderConfig[] {
  if (!nodes.length) return [];
  return (nodes[0].provider_configs ?? []).flatMap((config) => {
    const matches = nodes.map((node) =>
      node.provider_configs?.find(
        (candidate) =>
          candidate.provider_config_ref === config.provider_config_ref &&
          candidate.adapter_id === config.adapter_id,
      ),
    );
    if (matches.some((match) => !match)) return [];
    return [
      {
        ...config,
        allocation_types: (config.allocation_types ?? []).filter((allocation) =>
          matches.every((match) => match?.allocation_types?.includes(allocation)),
        ),
      },
    ];
  });
}

export function gpuInitializationIsRunning(state?: string): boolean {
  return state === "ACCEPTED" || state === "RUNNING";
}

export function gpuNodesHaveConflictingModels(nodes: GpuDiscoveredNode[]): boolean {
  const knownModels = nodes.map(
    (node) =>
      new Set(
        node.devices
          ?.map((device) => device.model_key)
          .filter((model): model is string => Boolean(model)),
      ),
  );
  const observed = knownModels.filter((models) => models.size > 0);
  if (observed.length < 2) return false;
  return ![...observed[0]].some((model) => observed.every((models) => models.has(model)));
}

export function gpuInitializationCanRetry(state?: string, retryable?: boolean): boolean {
  return state === "BLOCKED" && retryable === true;
}

export function gpuInitializationStatus(state?: string): { label: string; tone: StatusBadgeTone } {
  const states: Record<string, { label: string; tone: StatusBadgeTone }> = {
    ACCEPTED: { label: "已受理", tone: "info" },
    RUNNING: { label: "执行中", tone: "info" },
    SUCCEEDED: { label: "已完成", tone: "success" },
    BLOCKED: { label: "执行受阻", tone: "warning" },
    CONFLICT: { label: "存在冲突", tone: "danger" },
    FAILED: { label: "执行失败", tone: "danger" },
    PENDING: { label: "等待执行", tone: "default" },
    SKIPPED: { label: "已跳过", tone: "default" },
  };
  return states[state ?? ""] ?? { label: state || "-", tone: "default" };
}

export function fixedPartitionMemoryMib(bytes: string): string | undefined {
  if (!/^[1-9]\d*$/.test(bytes) || BigInt(bytes) > 18446744073709551615n) return undefined;
  return ((BigInt(bytes) + 1048575n) / 1048576n).toString();
}

export function validateGpuMemory(
  value: string | undefined,
  positive: boolean,
  nvidia: boolean,
): string | undefined {
  if (!/^(0|[1-9]\d*)$/.test(value ?? "")) return "请输入十进制整数";
  const memory = BigInt(value!);
  if ((positive && memory === 0n) || memory > (nvidia ? 2147483647n : 9223372036854775807n)) {
    return nvidia ? "请输入 1–2147483647 范围内的显存" : "请输入有效的显存整数";
  }
  return undefined;
}
