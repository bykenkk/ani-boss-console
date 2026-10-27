import assert from "node:assert/strict";
import test from "node:test";
import { buildPublicNetworkInput } from "../../src/components/public-network/PublicNetworkCreateModal/form.ts";

test("public network request uses a managed gateway and preserves the allowed IP window", () => {
  const input = buildPublicNetworkInput({
    name: " Public network ",
    description: " Allowed range ",
    vlanId: "vlan_0123456789abcdef0123456789abcdef",
    cidr: " 10.10.20.0/22 ",
    allocationStart: "10.10.20.201",
    allocationEnd: "10.10.20.210",
    upstreamGateway: "10.10.23.254",
    ovnGateway: "10.10.20.201",
  });
  assert.equal(Object.hasOwn(input, "gateway_id"), false);
  assert.equal(input.vlan_network_id, "vlan_0123456789abcdef0123456789abcdef");
  assert.equal(input.cidr, "10.10.20.0/22");
  assert.equal(input.upstream_gateway_ip, "10.10.23.254");
  assert.equal(input.ovn_gateway_ip, "10.10.20.201");
  assert.deepEqual(input.excluded_ips, ["10.10.20.0..10.10.20.201", "10.10.20.211..10.10.23.255"]);
});
