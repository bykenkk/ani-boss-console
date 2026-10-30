import assert from "node:assert/strict";
import { test } from "node:test";
import {
  AddressPoolValidationError,
  buildAddressPool,
  type PublicAddressPoolInput,
} from "./address-pool.ts";
import { buildPublicNetworkInput } from "./form.ts";

const originalPool: PublicAddressPoolInput = {
  cidr: "172.16.102.0/24",
  allocationStart: "172.16.102.192",
  allocationEnd: "172.16.102.207",
  ovnGatewayIp: "172.16.102.2",
  upstreamGatewayIp: "172.16.102.1",
};

test("the original public network keeps its gateways outside the allocation window", () => {
  assert.deepEqual(buildAddressPool(originalPool), {
    allocatableCount: 16,
    excludedIps: ["172.16.102.0..172.16.102.191", "172.16.102.208..172.16.102.255"],
  });
  assert.deepEqual(
    buildPublicNetworkInput({
      name: "cluster-public-102-res-20261022",
      vlanId: "restored-vlan",
      cidr: originalPool.cidr,
      allocationStart: originalPool.allocationStart,
      allocationEnd: originalPool.allocationEnd,
      ovnGateway: originalPool.ovnGatewayIp,
      upstreamGateway: originalPool.upstreamGatewayIp,
    }),
    {
      name: "cluster-public-102-res-20261022",
      description: undefined,
      mode: "underlay",
      vlan_network_id: "restored-vlan",
      cidr: "172.16.102.0/24",
      ovn_gateway_ip: "172.16.102.2",
      upstream_gateway_ip: "172.16.102.1",
      excluded_ips: ["172.16.102.0..172.16.102.191", "172.16.102.208..172.16.102.255"],
    },
  );
});

test("only gateways inside the allocation window reduce the available count", async (t) => {
  for (const [ovnGatewayIp, upstreamGatewayIp, allocatableCount, excludedIps] of [
    [
      "172.16.102.250",
      "172.16.102.1",
      16,
      ["172.16.102.0..172.16.102.191", "172.16.102.208..172.16.102.255"],
    ],
    [
      "172.16.102.192",
      "172.16.102.1",
      15,
      ["172.16.102.0..172.16.102.192", "172.16.102.208..172.16.102.255"],
    ],
    [
      "172.16.102.207",
      "172.16.102.1",
      15,
      ["172.16.102.0..172.16.102.191", "172.16.102.207..172.16.102.255"],
    ],
    [
      "172.16.102.200",
      "172.16.102.1",
      15,
      ["172.16.102.0..172.16.102.191", "172.16.102.200", "172.16.102.208..172.16.102.255"],
    ],
    [
      "172.16.102.2",
      "172.16.102.200",
      15,
      ["172.16.102.0..172.16.102.191", "172.16.102.200", "172.16.102.208..172.16.102.255"],
    ],
    [
      "172.16.102.200",
      "172.16.102.201",
      14,
      [
        "172.16.102.0..172.16.102.191",
        "172.16.102.200..172.16.102.201",
        "172.16.102.208..172.16.102.255",
      ],
    ],
  ] as const) {
    await t.test(`${ovnGatewayIp} / ${upstreamGatewayIp}`, () => {
      assert.deepEqual(buildAddressPool({ ...originalPool, ovnGatewayIp, upstreamGatewayIp }), {
        allocatableCount,
        excludedIps,
      });
    });
  }
});

test("a single-address window is usable unless a gateway consumes it", () => {
  const singleAddressPool = { ...originalPool, allocationEnd: originalPool.allocationStart };
  assert.equal(buildAddressPool(singleAddressPool).allocatableCount, 1);
  assert.throws(
    () => buildAddressPool({ ...singleAddressPool, ovnGatewayIp: originalPool.allocationStart }),
    (error) => error instanceof AddressPoolValidationError && error.field === "allocationEnd",
  );
  assert.throws(
    () =>
      buildAddressPool({
        ...originalPool,
        allocationEnd: "172.16.102.193",
        ovnGatewayIp: "172.16.102.192",
        upstreamGatewayIp: "172.16.102.193",
      }),
    (error) => error instanceof AddressPoolValidationError && error.field === "allocationEnd",
  );
});

test("gateways still must be distinct usable hosts inside the CIDR", async (t) => {
  for (const field of ["ovnGatewayIp", "upstreamGatewayIp"] as const) {
    for (const address of ["172.16.102.0", "172.16.102.255", "172.16.103.2", "invalid"]) {
      await t.test(`${field}: ${address}`, () => {
        assert.throws(
          () => buildAddressPool({ ...originalPool, [field]: address }),
          (error) => error instanceof AddressPoolValidationError && error.field === field,
        );
      });
    }
  }
  assert.throws(
    () => buildAddressPool({ ...originalPool, ovnGatewayIp: originalPool.upstreamGatewayIp }),
    (error) => error instanceof AddressPoolValidationError && error.field === "ovnGatewayIp",
  );
});
