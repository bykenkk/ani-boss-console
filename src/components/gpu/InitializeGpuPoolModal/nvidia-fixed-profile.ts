import type { GpuInitializationSupplyFacts } from "./supply-facts";

export const nvidiaFixedParts = [2, 4, 8] as const;

export interface NvidiaFixedProfile {
  parts: number;
  memoryMiBPerDevice: string;
  coreLimitPercent: number;
  unusedMemoryMiB: string;
  unusedCorePercent: number;
}

export interface NvidiaFixedProfilePreview {
  profile?: NvidiaFixedProfile;
  issue?: string;
  source?: "registration" | "observation";
  splitCount?: number;
}

export function previewNvidiaFixedProfile(
  facts: GpuInitializationSupplyFacts,
  parts?: number,
): NvidiaFixedProfilePreview {
  if (
    facts.identity.adapterId !== "volcano-hami-mib-v1" ||
    facts.identity.allocationType !== "DYNAMIC_SHARED"
  ) {
    return {};
  }
  if (!facts.ready || facts.loading || facts.error || facts.hasMore) {
    return { issue: "请等待供给信息查询完整后选择切片方案。" };
  }
  // A browser may not retain an older registration's receipt reference.
  // Observed values may propose a spec; only the backend validates its approval.
  const registered = facts.registered;
  const memory = registered
    ? registered.resourceType.max_memory_mib_per_device
    : facts.observed?.maxMemoryMiBPerDevice;
  const factor = registered ? registered.baseline.memory_block_mib : facts.observed?.memoryBlockMiB;
  const splitCount = registered ? registered.baseline.split_count : facts.observed?.splitCount;
  if (
    !memory ||
    !/^[1-9]\d*$/.test(memory) ||
    BigInt(memory) > 2147483647n ||
    (factor !== 1 && factor !== 10) ||
    splitCount === undefined ||
    !Number.isInteger(splitCount) ||
    splitCount < 2 ||
    splitCount > 2147483647
  ) {
    return { issue: "供给显存、分配单位或每卡最大共享份数尚未取得，请刷新供给信息。" };
  }
  const context = {
    source: registered ? ("registration" as const) : ("observation" as const),
    splitCount,
  };
  if (parts === undefined || !nvidiaFixedParts.some((value) => value === parts)) {
    return { ...context, issue: "请选择 2、4 或 8 等分方案。" };
  }
  if (splitCount < parts) {
    return { ...context, issue: "所选方案超过插件已配置的每卡共享份数，请选择更少的份数。" };
  }
  // Same arithmetic as ACC PreviewProfile; the displayed source stays explicit.
  const total = BigInt(memory);
  const count = BigInt(parts);
  const block = BigInt(factor);
  const perPart = (total / block / count) * block;
  if (perPart === 0n) {
    return { ...context, issue: "该方案的每份显存小于分配单位，请选择更少的份数。" };
  }
  const cores = Math.floor(100 / parts);
  return {
    ...context,
    profile: {
      parts,
      memoryMiBPerDevice: perPart.toString(),
      coreLimitPercent: cores,
      unusedMemoryMiB: (total - perPart * count).toString(),
      unusedCorePercent: 100 - cores * parts,
    },
  };
}
