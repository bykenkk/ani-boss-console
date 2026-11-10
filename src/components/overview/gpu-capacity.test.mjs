import assert from "node:assert/strict";
import test from "node:test";
import {
  buildGpuOverview,
  formatGpuAmount,
  formatGpuMiB,
  formatGpuInteger,
  getDeviceHealth,
} from "./gpu-capacity";
const cluster = {
  cluster_id: "cluster",
  display_name: "Cluster",
  connection_ref: "",
  version: "1",
};
function resource(overrides = {}) {
  return {
    allocation_type: "PHYSICAL",
    resource_key: "nvidia.com/gpu",
    basis: "NATIVE_ALLOCATION",
    granularity: "DEVICE",
    totals: {
      total_units: "2",
      allocated_units: "0",
      unallocated_units: "2",
      total_memory_mib: null,
      allocated_memory_mib: null,
      unallocated_memory_mib: null,
    },
    details: [],
    missing_fields: [],
    observed_at: "",
    ...overrides,
  };
}
function group(id, rows) {
  return {
    group_id: id,
    pool_id: "pool",
    cluster_id: "cluster",
    model_key: "model",
    display_name: id,
    admission: "ADMISSION_OPEN",
    queue_name: "default",
    version: "1",
    baseline: {
      baseline_id: id,
      adapter_id: "adapter",
      memory_block_mib: 10,
      split_count: 10,
      core_budget_additive: true,
      runtime_class_name: "",
      resource_types: rows.map((r) => ({
        allocation_type: r.allocation_type,
        resource_key: r.resource_key,
        memory_capacity_bytes: "0",
        compute_units_per_device: 0,
        max_devices_per_replica: 1,
        max_memory_mib_per_device: "0",
      })),
    },
  };
}
function snapshot(rows = [resource()]) {
  return {
    cluster,
    inventory: { items: [], total: "0" },
    pools: { items: [{ pool_id: "pool", cluster_id: "cluster", display_name: "Pool" }] },
    groups: [{ items: [group("g1", rows)] }],
    capacities: [
      { group_id: "g1", physical_device_count: "2", resource_types: rows, observed_at: "" },
    ],
  };
}
const build = (s) => buildGpuOverview({ items: [cluster] }, [s]);
test("same group repeated in catalog or capacity is counted once, with known zero", () => {
  const s = snapshot();
  s.groups.push(s.groups[0]);
  s.pools.items.push(s.pools.items[0]);
  s.capacities.push(s.capacities[0]);
  const result = build(s);
  assert.equal(result.physicalCount, "2");
  assert.equal(result.wholeTotal, "2");
  assert.equal(result.wholeAllocated, "0");
  assert.equal(result.wholeFree, "2");
  assert.equal(result.models[0].resources[0].totals.total_units, "2");
});
test("nullable native fields are independent of known zero", () => {
  const s = snapshot([
    resource({
      allocation_type: "DYNAMIC_SHARED",
      totals: {
        total_units: "20",
        allocated_units: null,
        unallocated_units: null,
        total_memory_mib: "0",
        allocated_memory_mib: null,
        unallocated_memory_mib: "0",
      },
    }),
  ]);
  const result = build(s);
  assert.equal(result.sharedTotalMiB, "0");
  assert.equal(result.sharedAllocatedMiB, void 0);
  assert.equal(result.sharedFreeMiB, "0");
  assert.equal(formatGpuAmount(undefined), "未知");
  assert.equal(formatGpuAmount("0"), "0");
  assert.equal(formatGpuAmount("9007199254740992"), "9,007,199,254,740,992");
});
test("Hygon node resources and fixed partitions never become NVIDIA cards or memory", () => {
  const s = snapshot([
    resource({
      basis: "BOUND_POD_REQUEST",
      granularity: "NODE_RESOURCE",
      resource_key: "hygon.com/dcu",
    }),
    resource({
      basis: "BOUND_POD_REQUEST",
      granularity: "NODE_RESOURCE",
      allocation_type: "FIXED_PARTITION",
      resource_key: "hygon.com/dcu-vdev-16g",
    }),
  ]);
  const result = build(s);
  assert.equal(result.wholeTotal, void 0);
  assert.equal(result.sharedTotalMiB, void 0);
  assert.equal(result.physicalCount, "2");
  assert.equal(result.models[0].resources.length, 2);
  assert.equal(result.models[0].resources[0].totals.total_memory_mib, null);
});
test("missing group or paged catalog never reports a partial sum as complete", () => {
  const s = snapshot();
  const g2 = group("g2", [resource()]);
  s.groups[0].items.push(g2);
  let result = build(s);
  assert.equal(result.wholeFree, void 0);
  assert.equal(result.physicalCount, void 0);
  assert.equal(result.models[0].resources.length, 0);
  assert.equal(result.incomplete, true);
  s.groups[0].items.pop();
  s.groups[0].next_page_token = "more";
  result = build(s);
  assert.equal(result.wholeTotal, void 0);
  assert.equal(result.models[0].resources.length, 0);
});
test("fixed partition inventory is excluded from physical health counts", () => {
  const s = snapshot();
  s.capacities[0].physical_device_count = "1";
  const device = {
    cluster_id: "cluster",
    group_id: "g1",
    health: "HEALTHY",
    observation: { complete: true, observed_at: "2026-11-11T00:00:00Z" },
  };
  s.inventory = {
    total: "2",
    items: [
      { ...device, device_id: "parent", device_kind: "PHYSICAL_DEVICE" },
      { ...device, device_id: "slice", device_kind: "FIXED_PARTITION_DEVICE" },
    ],
  };
  assert.deepEqual(build(s).health, { healthy: 1, unhealthy: 0, unknown: 0 });
  s.capacities[0].physical_device_count = null;
  assert.equal(build(s).health, void 0);
});

test("model totals preserve exact int64 decimals beyond Number precision", () => {
  const s = snapshot([
    resource({
      totals: {
        total_units: "9007199254740993",
        allocated_units: "0",
        unallocated_units: "9007199254740993",
        total_memory_mib: null,
        allocated_memory_mib: null,
        unallocated_memory_mib: null,
      },
    }),
  ]);
  const second = resource({
    totals: {
      total_units: "1",
      allocated_units: "0",
      unallocated_units: "1",
      total_memory_mib: null,
      allocated_memory_mib: null,
      unallocated_memory_mib: null,
    },
  });
  s.groups[0].items.push(group("g2", [second]));
  s.capacities.push({
    group_id: "g2",
    physical_device_count: "1",
    resource_types: [second],
    observed_at: "",
  });
  const totals = build(s).models[0].resources[0].totals;
  assert.equal(totals.total_units, "9007199254740994");
  assert.equal(build(s).wholeTotal, "9007199254740994");
  assert.equal(formatGpuMiB("9007199254740993"), "8,796,093,022,208.00");
  assert.equal(totals.allocated_units, "0");
  assert.equal(totals.total_memory_mib, null);
  assert.equal(formatGpuInteger(totals.total_units), "9,007,199,254,740,994");
});
test("incomplete optional inventory fields do not mask explicit health", () => {
  const device = {
    health: "UNHEALTHY",
    observation: { complete: false, observed_at: "2026-11-11T00:00:00Z" },
  };
  assert.equal(getDeviceHealth(device), "unhealthy");
  device.health = "HEALTHY";
  assert.equal(getDeviceHealth(device), "healthy");
  device.health = "UNKNOWN";
  assert.equal(getDeviceHealth(device), "unknown");
});

test("a mismatched physical inventory cannot claim zero health counts", () => {
  assert.equal(build(snapshot()).health, undefined);
});
