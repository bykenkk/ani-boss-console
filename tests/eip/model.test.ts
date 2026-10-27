import assert from "node:assert/strict";
import test from "node:test";
import { eipBindingLabel, eipReleaseBlockReason } from "../../src/components/eip/model.ts";
import type { EIP } from "../../src/api/eips/types.ts";

const freeEIP: EIP = {
  id: "eip_11111111111111111111111111111111",
  name: "free",
  description: "",
  state: "available",
  reason: "",
  reason_message: "",
  version: "1",
  address: "10.10.20.202",
  tenant_id: 17,
  tenant_name: "tenant",
  resource_tenant_id: "11111111-1111-4111-8111-111111111111",
  pool_id: "pool_11111111111111111111111111111111",
  pool_name: "public",
  cluster_id: "cluster",
  scope: "public",
  managed_by: "tenant",
  binding_state: "unbound",
  observation_stale: false,
  last_operation_id: "",
};

test("only independent tenant public EIPs offer release", () => {
  assert.equal(eipReleaseBlockReason(freeEIP), undefined);
  assert.ok(eipReleaseBlockReason({ ...freeEIP, scope: "intranet", managed_by: "system" }));
  assert.ok(eipReleaseBlockReason({ ...freeEIP, state: "deleting" }));
  assert.ok(eipReleaseBlockReason({ ...freeEIP, binding_state: "" }));
});
test("load balancer and SNAT claims block release even if legacy binding_state is unbound", () => {
  for (const kind of ["load_balancer", "vpc_snat"]) {
    const item = { ...freeEIP, binding_target: { kind, id: "bound-resource", state: "active" } };
    assert.ok(eipReleaseBlockReason(item));
    assert.notEqual(eipBindingLabel(item), "未绑定");
  }
  assert.equal(eipBindingLabel(freeEIP), "未绑定");
});
test("platform default outlet addresses belong to the system lifecycle", () => {
  const item = {
    ...freeEIP,
    managed_by: "system",
    resource_tenant_id: "",
    tenant_id: 0,
    binding_target: {
      kind: "platform_default_egress",
      id: "dve_11111111111111111111111111111111",
      state: "available",
    },
  };
  assert.equal(eipBindingLabel(item), "平台组件出网");
  assert.ok(eipReleaseBlockReason(item));
});
