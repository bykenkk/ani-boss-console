import assert from "node:assert/strict";
import test from "node:test";
const values = new Map();
globalThis.localStorage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
  removeItem: (key) => values.delete(key),
};
globalThis.window = { localStorage: globalThis.localStorage };
const { gpuScopeKey, requireGpuOperationTarget, requireGpuSupplyTarget } =
  await import("../src/api/accelerator/scope.ts");
const drafts = await import("../src/api/accelerator/initialization-draft.ts");
const registrations = await import("../src/stores/gpu-supply-registration.ts");
const intents = await import("../src/stores/gpu-initialization.ts");
const target = {
  principal: "7",
  connection_ref: "managed:target",
  cluster_id: "11111111-1111-4111-8111-111111111111",
};
const input = {
  connection_ref: target.connection_ref,
  discovery_revision: "uid-bound-revision",
  pools: [],
  groups: [],
  profiles: [],
};

test("exact accepted or uncertain request survives reload only in its three-part target scope", async () => {
  const first = drafts.initializationRequest(target, input);
  const bytes = JSON.stringify(first);
  assert.equal(JSON.stringify(drafts.initializationRequest(target, input)), bytes);
  drafts.rememberInitializationOperation(target, {
    operation_id: "op-a",
    cluster_id: target.cluster_id,
  });
  const fresh = await import("../src/api/accelerator/initialization-draft.ts?reload");
  assert.equal(JSON.stringify(fresh.initializationRequest(target, input)), bytes);
  assert.equal(fresh.readInitializationDraft(target).operation_id, "op-a");
  for (const changed of [
    { ...target, principal: "8" },
    { ...target, connection_ref: "managed:other" },
    { ...target, cluster_id: "22222222-2222-4222-8222-222222222222" },
  ]) {
    assert.notEqual(gpuScopeKey(changed), gpuScopeKey(target));
    assert.equal(fresh.readInitializationDraft(changed), undefined);
  }
  assert.throws(
    () => fresh.initializationRequest(target, { ...input, discovery_revision: "different" }),
    /已有初始化意图/,
  );
});

test("v1 ref-only drafts never seed a new v2 intent", () => {
  const other = { ...target, principal: "legacy-principal" };
  values.set(
    `gpu-initialization:${encodeURIComponent(other.principal)}:${encodeURIComponent(other.connection_ref)}`,
    JSON.stringify({ input, request: { ...input, idempotency_key: "old-key" } }),
  );
  assert.equal(drafts.readInitializationDraft(other), undefined);
  assert.notEqual(drafts.initializationRequest(other, input).idempotency_key, "old-key");
});

test("late responses update their original scope and cannot import another target", () => {
  const next = { ...target, principal: "8" };
  const result = {
    registration_id: "receipt-a",
    connection_ref: target.connection_ref,
    configurations: [{ provider_config_ref: "supply-a", connection_ref: target.connection_ref }],
  };
  registrations.rememberGpuSupplyRegistration(result, target);
  const state = registrations.gpuSupplyRegistrationIntents.getState();
  assert.equal(state.registrations[gpuScopeKey(target)]["supply-a"], "receipt-a");
  assert.equal(state.registrations[gpuScopeKey(next)], undefined);
  assert.throws(() => requireGpuSupplyTarget({ connection_ref: "other" }, target), /不属于/);
  assert.throws(
    () => requireGpuOperationTarget({ cluster_id: next.cluster_id + "other" }, target),
    /不属于/,
  );
  assert.throws(() => requireGpuOperationTarget({}, target), /不属于/);
  const persisted = values.get("ani-boss-gpu-supply-registration-references-v2");
  assert.equal(JSON.parse(persisted).state.inputs, undefined);
});

test("pending create and retry intents stay isolated by principal/ref/uid and operation", () => {
  const other = { ...target, cluster_id: "22222222-2222-4222-8222-222222222222" };
  intents.setGpuInitializationIntent(target, input);
  intents.setGpuInitializationRetryIntent(target, "op-a", {
    operation_id: "op-a",
    expected_version: "1",
  });
  const state = intents.gpuInitializationIntents.getState();
  assert.equal(state.creates[gpuScopeKey(other)], undefined);
  assert.equal(state.retries[`${gpuScopeKey(other)}:op-a`], undefined);
  assert.equal(state.retries[`${gpuScopeKey(target)}:op-b`], undefined);
});
