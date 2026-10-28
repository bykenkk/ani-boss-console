import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGpuOverview,
  getDeviceHealth,
  selectCapacityProfiles,
  type ClusterGpuSnapshot,
} from "../../src/components/overview/gpu-capacity.ts";
import type { GpuCapacity, GpuDevice, GpuProfile } from "../../src/api/accelerator/types.ts";

const cluster = { cluster_id: "cluster", display_name: "集群", connection_ref: "", version: "1" };
const clusters = { items: [cluster] };
function fixture(mode: "WHOLE_EXCLUSIVE" | "SHARED_FIXED" = "SHARED_FIXED"): ClusterGpuSnapshot {
  const device: GpuDevice = {
    device_id: "gpu",
    cluster_id: "cluster",
    group_id: "group",
    vendor_device_id: "GPU-uuid",
    model_key: "4090",
    physical_memory_bytes: "51527024640",
    health: "HEALTHY",
    observation: { complete: true, observed_at: "2026-10-28T01:00:00Z" },
  };
  const profile = {
    profile_id: "profile",
    profile_version: "1",
    state: "PROFILE_ACTIVE",
    spec: { group_id: "group", mode },
  } as GpuProfile;
  const capacity: GpuCapacity = {
    profile_id: "profile",
    profile_version: "1",
    mode,
    physical_device_count: "1",
    nominal_units: "2",
    known_committed_units: "1",
    known_free_units: "1",
    unplaced_requested_units: "0",
    observation: { complete: true },
    devices: [
      {
        device_id: "gpu",
        nominal_units: "2",
        known_committed_units: "1",
        known_free_units: "1",
        safe_memory_budget_mib: "49140",
        committed_memory_mib: "24570",
        complete: true,
      },
    ],
  };
  return {
    cluster,
    inventory: { items: [device], total: "1" },
    pools: { items: [{ pool_id: "pool", cluster_id: "cluster", display_name: "池" }] },
    groups: [
      {
        items: [
          {
            group_id: "group",
            pool_id: "pool",
            cluster_id: "cluster",
            display_name: "供给",
            model_key: "4090",
            mode,
            admission: "ADMISSION_OPEN",
            version: "1",
            queue_name: "queue",
          },
        ],
      },
    ],
    profiles: { items: [profile] },
    capacities: [capacity],
  };
}

test("shared allocation is budget minus commitments, not physical memory or GPU shares", () => {
  const overview = buildGpuOverview(clusters, [fixture()]);
  assert.equal(overview.physicalCount, 1);
  assert.equal(overview.sharedTotalMiB, 49140);
  assert.equal(overview.sharedAllocatedMiB, 24570);
  assert.equal(overview.sharedFreeMiB, 24570);
  assert.equal(overview.wholeFree, 0);
});

test("different profiles on the same GPU never multiply its budget", () => {
  const f = fixture();
  const first = f.profiles!.items![0];
  f.profiles!.items!.push({ ...first, profile_id: "profile-two" });
  const c = f.capacities[0]!;
  f.capacities.push({
    ...c,
    profile_id: "profile-two",
    devices: [{ ...c.devices![0], nominal_units: "4", known_free_units: "2" }],
  });
  assert.equal(selectCapacityProfiles(f.profiles!.items!).length, 1);
  assert.equal(buildGpuOverview(clusters, [f]).sharedTotalMiB, 49140);
});

test("conflicting cross-profile commitments make capacity unknown", () => {
  const f = fixture();
  f.profiles!.items!.push({ ...f.profiles!.items![0], profile_id: "conflict" });
  f.capacities.push({
    ...f.capacities[0]!,
    profile_id: "conflict",
    devices: [{ ...f.capacities[0]!.devices![0], committed_memory_mib: "0" }],
  });
  assert.equal(buildGpuOverview(clusters, [f]).sharedFreeMiB, undefined);
});

test("incomplete backend observations never turn into zero or free whole cards", () => {
  const f = fixture("WHOLE_EXCLUSIVE");
  f.capacities[0]!.devices![0].complete = false;
  f.capacities[0]!.devices![0].known_free_units = "0";
  const overview = buildGpuOverview(clusters, [f]);
  assert.equal(overview.wholeTotal, 1);
  assert.equal(overview.wholeFree, undefined);
  assert.equal(overview.wholeAllocated, undefined);
  assert.equal(overview.health?.healthy, 1);
  assert.equal(overview.health?.unknown, 0);
});

test("a managed group without a Profile has unknown budget", () => {
  const f = fixture();
  f.profiles = { items: [] };
  f.capacities = [];
  const overview = buildGpuOverview(clusters, [f]);
  assert.equal(overview.physicalCount, 1);
  assert.equal(overview.sharedTotalMiB, undefined);
  assert.equal(overview.incomplete, true);
});

test("a partial inventory keeps server physical total but cannot claim complete statistics", () => {
  const f = fixture();
  f.inventory!.total = "101";
  const overview = buildGpuOverview(clusters, [f]);
  assert.equal(overview.physicalCount, 101);
  assert.equal(overview.health, undefined);
  assert.equal(overview.sharedTotalMiB, undefined);
  assert.equal(
    buildGpuOverview({ ...clusters, next_page_token: "more" }, [f]).physicalCount,
    undefined,
  );
});

test("closed admission is separate from unallocated resources and health", () => {
  const f = fixture();
  f.groups[0]!.items![0].admission = "ADMISSION_CLOSED";
  const overview = buildGpuOverview(clusters, [f]);
  assert.equal(overview.sharedFreeMiB, 24570);
  assert.equal(overview.models[0].closedGroups, 1);
});

test("a confirmed empty platform has zeros; a missing response has unknowns", () => {
  const empty = buildGpuOverview({ items: [] }, []);
  assert.equal(empty.physicalCount, 0);
  assert.equal(empty.sharedTotalMiB, 0);
  assert.equal(empty.wholeFree, 0);
  assert.equal(buildGpuOverview(undefined, []).physicalCount, undefined);
});

test("unknown observation does not become a hardware failure", () => {
  const d = fixture().inventory!.items[0];
  assert.equal(getDeviceHealth({ ...d, observation: { complete: false } }), "unknown");
  assert.equal(getDeviceHealth({ ...d, health: "UNHEALTHY" }), "unhealthy");
});
