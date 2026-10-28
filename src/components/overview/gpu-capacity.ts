import type {
  GpuCapacity,
  GpuCluster,
  GpuDevice,
  GpuDeviceCapacity,
  GpuMode,
  GpuPage,
  GpuPool,
  GpuProfile,
  GpuSupplyGroup,
} from "@/api/accelerator";
import type { GpuDeviceList } from "@/api/gpu-monitoring";
import { formatDateTime } from "../../lib/date.ts";

export interface ClusterGpuSnapshot {
  cluster: GpuCluster;
  inventory?: GpuDeviceList;
  pools?: GpuPage<GpuPool>;
  groups: Array<GpuPage<GpuSupplyGroup> | undefined>;
  profiles?: GpuPage<GpuProfile>;
  capacities: Array<GpuCapacity | undefined>;
}
export interface GpuAllocation {
  mode?: GpuMode;
  admission?: string;
  capacity?: GpuDeviceCapacity;
}
export interface GpuCapacityTotals {
  wholeTotal?: number;
  wholeAllocated?: number;
  wholeFree?: number;
  sharedTotalMiB?: number;
  sharedAllocatedMiB?: number;
  sharedFreeMiB?: number;
}
export interface ModelGpuCapacity extends GpuCapacityTotals {
  key: string;
  clusterName: string;
  modelKey: string;
  closedGroups: number;
}
export interface PlatformGpuOverview extends GpuCapacityTotals {
  physicalCount?: number;
  health?: { healthy: number; unhealthy: number; unknown: number };
  models: ModelGpuCapacity[];
  allocations: Map<string, GpuAllocation>;
  incomplete: boolean;
}

export const deviceKey = (clusterId: string, deviceId: string) => `${clusterId}/${deviceId}`;

export function selectCapacityProfiles(profiles: GpuProfile[]) {
  const groups = new Set<string>();
  return profiles.filter((profile) => {
    if (profile.state === "PROFILE_DELETED" || groups.has(profile.spec.group_id)) return false;
    groups.add(profile.spec.group_id);
    return true;
  });
}

export function getDeviceHealth(device: GpuDevice) {
  if (!device.observation?.complete || !formatDateTime(device.observation.observed_at, ""))
    return "unknown";
  if (device.health === "UNHEALTHY") return "unhealthy";
  if (device.health !== "HEALTHY") return "unknown";
  return "healthy";
}

export function formatGpuAmount(value: number | undefined) {
  return value === undefined || !Number.isFinite(value)
    ? "未知"
    : value.toLocaleString("zh-CN", { maximumFractionDigits: 2 });
}

function totals(
  devices: GpuDevice[],
  allocations: Map<string, GpuAllocation>,
  complete: boolean,
): GpuCapacityTotals {
  if (
    !complete ||
    devices.some((d) => !allocations.get(deviceKey(d.cluster_id, d.device_id))?.mode)
  )
    return {};
  const result: GpuCapacityTotals = {};
  for (const mode of ["WHOLE_EXCLUSIVE", "SHARED_FIXED"] as const) {
    const rows = devices.filter(
      (d) => allocations.get(deviceKey(d.cluster_id, d.device_id))?.mode === mode,
    );
    if (mode === "WHOLE_EXCLUSIVE") result.wholeTotal = rows.length;
    const capacities = rows.map(
      (d) => allocations.get(deviceKey(d.cluster_id, d.device_id))?.capacity,
    );
    if (capacities.some((c) => !c?.complete)) continue;
    // A protobuf zero is meaningful; missing fields or negative residuals are unknown.
    const sum = (field: keyof GpuDeviceCapacity) => {
      const values = capacities.map((c) => c?.[field]);
      if (
        values.some(
          (v) => typeof v !== "string" || v === "" || !Number.isFinite(Number(v)) || Number(v) < 0,
        )
      )
        return undefined;
      return values.reduce<number>((total, value) => total + Number(value), 0);
    };
    if (mode === "WHOLE_EXCLUSIVE") {
      result.wholeAllocated = sum("known_committed_units");
      result.wholeFree = sum("known_free_units");
    } else {
      const budget = sum("safe_memory_budget_mib");
      const allocated = sum("committed_memory_mib");
      if (budget !== undefined && allocated !== undefined && allocated <= budget) {
        result.sharedTotalMiB = budget;
        result.sharedAllocatedMiB = allocated;
        result.sharedFreeMiB = budget - allocated;
      }
    }
  }
  return result;
}

export function buildGpuOverview(
  clusters: GpuPage<GpuCluster> | undefined,
  snapshots: ClusterGpuSnapshot[],
): PlatformGpuOverview {
  const allocations = new Map<string, GpuAllocation>();
  const conflicts = new Set<string>();
  const inventory: GpuDevice[] = [];
  const models: ModelGpuCapacity[] = [];
  const fullClusters = Boolean(
    clusters && !clusters.next_page_token && snapshots.length === (clusters.items ?? []).length,
  );
  let physicalCount: number | undefined = fullClusters ? 0 : undefined;
  let complete = fullClusters;
  let inventoryComplete = fullClusters;
  for (const snapshot of snapshots) {
    const { cluster, pools, profiles } = snapshot;
    const items = snapshot.inventory?.items ?? [];
    const unique = new Map(items.map((d) => [deviceKey(d.cluster_id, d.device_id), d]));
    const fullInventory = Boolean(
      snapshot.inventory &&
      unique.size === Number(snapshot.inventory.total) &&
      unique.size === items.length,
    );
    if (physicalCount !== undefined)
      physicalCount = snapshot.inventory
        ? physicalCount + Number(snapshot.inventory.total)
        : undefined;
    const fullCatalog = Boolean(
      pools &&
      !pools.next_page_token &&
      snapshot.groups.length === (pools.items ?? []).length &&
      snapshot.groups.every((g) => g && !g.next_page_token),
    );
    const groupMap = new Map(
      snapshot.groups.flatMap((g) => g?.items ?? []).map((g) => [g.group_id, g]),
    );
    for (const d of unique.values()) {
      const g = groupMap.get(d.group_id);
      allocations.set(deviceKey(d.cluster_id, d.device_id), {
        mode: g?.mode,
        admission: g?.admission,
      });
    }
    for (const capacity of snapshot.capacities) {
      if (!capacity) continue;
      const profile = profiles?.items?.find(
        (p) =>
          p.profile_id === capacity.profile_id && p.profile_version === capacity.profile_version,
      );
      const group = profile && groupMap.get(profile.spec.group_id);
      if (!group || group.mode !== capacity.mode) continue;
      for (const device of capacity.devices ?? []) {
        const key = deviceKey(cluster.cluster_id, device.device_id);
        const previous = allocations.get(key);
        const fields: Array<keyof GpuDeviceCapacity> =
          group.mode === "WHOLE_EXCLUSIVE"
            ? ["known_committed_units", "known_free_units", "complete"]
            : ["safe_memory_budget_mib", "committed_memory_mib", "complete"];
        if (
          previous?.capacity &&
          fields.some((field) => previous.capacity?.[field] !== device[field])
        )
          conflicts.add(key);
        allocations.set(key, { mode: group.mode, admission: group.admission, capacity: device });
      }
    }
    for (const key of conflicts) {
      const allocation = allocations.get(key);
      if (allocation) allocation.capacity = undefined;
    }
    const devices = [...unique.values()];
    inventory.push(...devices);
    complete &&= fullInventory && fullCatalog;
    inventoryComplete &&= fullInventory;
    for (const modelKey of new Set(devices.map((d) => d.model_key))) {
      const devicesOfModel = devices.filter((d) => d.model_key === modelKey);
      models.push({
        key: `${cluster.cluster_id}/${modelKey}`,
        clusterName: cluster.display_name,
        modelKey,
        closedGroups: [...groupMap.values()].filter(
          (g) => g.model_key === modelKey && g.admission === "ADMISSION_CLOSED",
        ).length,
        ...totals(devicesOfModel, allocations, fullInventory && fullCatalog),
      });
    }
  }
  const health = inventoryComplete ? { healthy: 0, unhealthy: 0, unknown: 0 } : undefined;
  if (health) for (const d of inventory) health[getDeviceHealth(d)]++;
  const summary = totals(inventory, allocations, complete);
  return {
    ...summary,
    physicalCount,
    health,
    models,
    allocations,
    incomplete:
      !complete ||
      Object.values(summary).some((v) => v === undefined) ||
      summary.sharedTotalMiB === undefined ||
      summary.wholeFree === undefined,
  };
}
