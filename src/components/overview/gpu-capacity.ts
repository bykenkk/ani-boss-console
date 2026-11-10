import type {
  GpuCluster,
  GpuDevice,
  GpuPage,
  GpuPool,
  GpuSupplyGroup,
  GpuSupplyGroupCapacity,
  GpuResourceTypeCapacity,
  GpuCapacityTotals as CapacityTotals,
} from "@/api/accelerator";
import type { GpuDeviceList } from "@/api/gpu-monitoring";
import { formatDateTime } from "@/lib/date";

export interface ClusterGpuSnapshot {
  cluster: GpuCluster;
  inventory?: GpuDeviceList;
  pools?: GpuPage<GpuPool>;
  groups: Array<GpuPage<GpuSupplyGroup> | undefined>;
  capacities: Array<GpuSupplyGroupCapacity | undefined>;
}
export interface GpuAllocation {
  admission: GpuSupplyGroup["admission"];
  resources: GpuResourceTypeCapacity[];
}
export interface GpuCapacityTotals {
  wholeTotal?: string;
  wholeAllocated?: string;
  wholeFree?: string;
  sharedTotalMiB?: string;
  sharedAllocatedMiB?: string;
  sharedFreeMiB?: string;
}
export interface ModelGpuCapacity {
  key: string;
  clusterName: string;
  modelKey: string;
  closedGroups: number;
  resources: GpuResourceTypeCapacity[];
}
export interface PlatformGpuOverview extends GpuCapacityTotals {
  physicalCount?: string;
  health?: { healthy: number; unhealthy: number; unknown: number };
  models: ModelGpuCapacity[];
  allocations: Map<string, GpuAllocation>;
  incomplete: boolean;
}
export const deviceKey = (clusterId: string, deviceId: string) => `${clusterId}/${deviceId}`;
const resourceKey = (r: GpuResourceTypeCapacity) =>
  JSON.stringify([r.allocation_type, r.resource_key, r.basis, r.granularity]);

export function getDeviceHealth(device: GpuDevice) {
  // Completeness covers other optional fields; preserve explicit health independently.
  if (!formatDateTime(device.observation?.observed_at, "")) return "unknown";
  if (device.health === "UNHEALTHY") return "unhealthy";
  return device.health === "HEALTHY" ? "healthy" : "unknown";
}
export function formatGpuAmount(value: string | number | undefined) {
  if (typeof value === "string") return formatGpuInteger(value);
  return value === undefined || !Number.isFinite(value)
    ? "未知"
    : value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}
// Keep int64 values in decimal form through aggregation and rendering.
function sumDecimals(values: Array<string | null | undefined>) {
  if (values.some((v) => typeof v !== "string" || !/^\d+$/.test(v))) return undefined;
  return values.reduce<bigint>((total, v) => total + BigInt(v!), 0n).toString();
}
export function formatGpuInteger(value: string | null | undefined) {
  return typeof value === "string" && /^\d+$/.test(value)
    ? BigInt(value).toLocaleString("zh-CN")
    : "未知";
}
function formatGpuScaled(value: string | null | undefined, divisor: bigint) {
  if (typeof value !== "string" || !/^\d+$/.test(value)) return "未知";
  const hundredths = (BigInt(value) * 100n + divisor / 2n) / divisor;
  return `${(hundredths / 100n).toLocaleString("zh-CN")}.${String(hundredths % 100n).padStart(2, "0")}`;
}
export const formatGpuMiB = (value: string | null | undefined) => formatGpuScaled(value, 1024n);
export const formatGpuBytesGiB = (value: string | null | undefined) =>
  formatGpuScaled(value, 1024n ** 3n);
const fields: Array<keyof CapacityTotals> = [
  "total_units",
  "allocated_units",
  "unallocated_units",
  "total_memory_mib",
  "allocated_memory_mib",
  "unallocated_memory_mib",
];
function mergeResources(rows: GpuResourceTypeCapacity[]) {
  const groups = new Map<string, GpuResourceTypeCapacity[]>();
  for (const row of rows) {
    const key = resourceKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }
  return [...groups.values()].map((items) => ({
    ...items[0],
    totals: Object.fromEntries(
      fields.map((field) => {
        const value = sumDecimals(items.map((item) => item.totals[field]));
        return [field, value ?? null];
      }),
    ) as unknown as CapacityTotals,
    details: items.flatMap((item) => item.details ?? []),
    missing_fields: [...new Set(items.flatMap((item) => item.missing_fields ?? []))],
  }));
}

export function buildGpuOverview(
  clusters: GpuPage<GpuCluster> | undefined,
  snapshots: ClusterGpuSnapshot[],
): PlatformGpuOverview {
  const allocations = new Map<string, GpuAllocation>();
  const models: ModelGpuCapacity[] = [];
  const inventory: GpuDevice[] = [];
  const physicalCounts: Array<string | null | undefined> = [];
  const allResources: GpuResourceTypeCapacity[] = [];
  const fullClusters = Boolean(
    clusters && !clusters.next_page_token && snapshots.length === (clusters.items ?? []).length,
  );
  let complete = fullClusters;
  let inventoryComplete = fullClusters;
  for (const snapshot of snapshots) {
    const { cluster, pools } = snapshot;
    const items = snapshot.inventory?.items ?? [];
    const unique = new Map(items.map((d) => [deviceKey(d.cluster_id, d.device_id), d]));
    const fullInventory = Boolean(
      snapshot.inventory &&
      unique.size === Number(snapshot.inventory.total) &&
      unique.size === items.length,
    );
    inventory.push(...unique.values());
    inventoryComplete &&= fullInventory;
    const fullCatalog = Boolean(
      pools &&
      !pools.next_page_token &&
      snapshot.groups.length === (pools.items ?? []).length &&
      snapshot.groups.every((g) => g && !g.next_page_token),
    );
    // Group capacity is read once regardless of how many Profiles use it.
    const groups = new Map(
      snapshot.groups.flatMap((g) => g?.items ?? []).map((g) => [g.group_id, g]),
    );
    const capacities = new Map(
      snapshot.capacities.filter((c) => c !== undefined).map((c) => [c.group_id, c]),
    );
    const fullCapacity = [...groups.values()].every((g) => {
      const c = capacities.get(g.group_id);
      return (
        c &&
        g.baseline?.resource_types.every((t) =>
          c.resource_types.some(
            (r) => r.allocation_type === t.allocation_type && r.resource_key === t.resource_key,
          ),
        )
      );
    });
    complete &&= fullCatalog && fullCapacity;
    for (const group of groups.values()) {
      const capacity = capacities.get(group.group_id);
      physicalCounts.push(capacity?.physical_device_count);
      const resources = capacity?.resource_types ?? [];
      allResources.push(...resources);
      for (const d of unique.values())
        if (d.group_id === group.group_id)
          allocations.set(deviceKey(d.cluster_id, d.device_id), {
            admission: group.admission,
            resources,
          });
    }
    for (const modelKey of new Set([...groups.values()].map((g) => g.model_key))) {
      const modelGroups = [...groups.values()].filter((g) => g.model_key === modelKey);
      models.push({
        key: `${cluster.cluster_id}/${modelKey}`,
        clusterName: cluster.display_name,
        modelKey,
        closedGroups: modelGroups.filter((g) => g.admission === "ADMISSION_CLOSED").length,
        resources:
          fullCatalog &&
          modelGroups.every((g) => {
            const c = capacities.get(g.group_id);
            return (
              c &&
              g.baseline?.resource_types.every((t) =>
                c.resource_types.some(
                  (r) =>
                    r.allocation_type === t.allocation_type && r.resource_key === t.resource_key,
                ),
              )
            );
          })
            ? mergeResources(
                modelGroups.flatMap((g) => capacities.get(g.group_id)?.resource_types ?? []),
              )
            : [],
      });
    }
  }
  const physicalCount = complete && physicalCounts.length ? sumDecimals(physicalCounts) : undefined;
  const physicalInventory = inventory.filter((d) => d.device_kind === "PHYSICAL_DEVICE");
  const health =
    inventoryComplete &&
    physicalCount !== undefined &&
    String(physicalInventory.length) === physicalCount
      ? { healthy: 0, unhealthy: 0, unknown: 0 }
      : undefined;
  // Fixed partitions are not additional physical cards.
  if (health) for (const d of physicalInventory) health[getDeviceHealth(d)]++;
  const summary: GpuCapacityTotals = {};
  // Only NVIDIA native device capacity has comparable card/MiB units.
  // Hygon node counts/CUs remain in their typed model rows.
  for (const [allocation, names] of [
    ["PHYSICAL", ["wholeTotal", "wholeAllocated", "wholeFree"]],
    ["DYNAMIC_SHARED", ["sharedTotalMiB", "sharedAllocatedMiB", "sharedFreeMiB"]],
  ] as const) {
    const rows = allResources.filter(
      (r) =>
        r.basis === "NATIVE_ALLOCATION" &&
        r.granularity === "DEVICE" &&
        r.allocation_type === allocation,
    );
    if (!complete || !rows.length) continue;
    const sourceFields =
      allocation === "PHYSICAL"
        ? (["total_units", "allocated_units", "unallocated_units"] as const)
        : (["total_memory_mib", "allocated_memory_mib", "unallocated_memory_mib"] as const);
    names.forEach((name, i) => {
      summary[name] = sumDecimals(rows.map((r) => r.totals[sourceFields[i]]));
    });
  }
  return {
    ...summary,
    physicalCount,
    health,
    models,
    allocations,
    incomplete:
      !complete ||
      !inventoryComplete ||
      physicalCount === undefined ||
      allResources.some((r) => r.missing_fields.length > 0),
  };
}
