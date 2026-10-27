import assert from "node:assert/strict";
import test from "node:test";
import {
  AddressPoolValidationError,
  buildAddressPool,
} from "../../src/components/public-network/PublicNetworkCreateModal/address-pool.ts";

const input = {
  cidr: "10.10.20.0/22",
  allocationStart: "10.10.20.201",
  allocationEnd: "10.10.20.210",
  ovnGatewayIp: "10.10.20.201",
  upstreamGatewayIp: "10.10.23.254",
};

test("the user's /22 exposes only .202 through .210 after reserving .201", () => {
  assert.deepEqual(buildAddressPool(input), {
    excludedIps: ["10.10.20.0..10.10.20.201", "10.10.20.211..10.10.23.255"],
    allocatableCount: 9,
  });
});

test("a gateway in the middle of the allowed window is excluded without removing other IPs", () => {
  assert.deepEqual(buildAddressPool({ ...input, ovnGatewayIp: "10.10.20.205" }), {
    excludedIps: ["10.10.20.0..10.10.20.200", "10.10.20.205", "10.10.20.211..10.10.23.255"],
    allocatableCount: 9,
  });
});

test("an upstream gateway inside the window consumes an additional address", () => {
  assert.deepEqual(buildAddressPool({ ...input, upstreamGatewayIp: "10.10.20.202" }), {
    excludedIps: ["10.10.20.0..10.10.20.202", "10.10.20.211..10.10.23.255"],
    allocatableCount: 8,
  });
});

test("full host windows still exclude network, broadcast and both gateways", () => {
  assert.deepEqual(
    buildAddressPool({
      cidr: "192.168.0.0/29",
      allocationStart: "192.168.0.1",
      allocationEnd: "192.168.0.6",
      ovnGatewayIp: "192.168.0.1",
      upstreamGatewayIp: "192.168.0.6",
    }),
    {
      excludedIps: ["192.168.0.0..192.168.0.1", "192.168.0.6..192.168.0.7"],
      allocatableCount: 4,
    },
  );
});

test("even an IPv4-wide subnet uses bounded intervals rather than enumerated addresses", () => {
  assert.deepEqual(buildAddressPool({ ...input, cidr: "0.0.0.0/0" }), {
    excludedIps: ["0.0.0.0..10.10.20.201", "10.10.20.211..255.255.255.255"],
    allocatableCount: 9,
  });
});

test("address arithmetic works above the signed 32-bit boundary", () => {
  assert.deepEqual(
    buildAddressPool({
      cidr: "200.0.0.0/24",
      allocationStart: "200.0.0.201",
      allocationEnd: "200.0.0.210",
      ovnGatewayIp: "200.0.0.210",
      upstreamGatewayIp: "200.0.0.254",
    }),
    {
      excludedIps: ["200.0.0.0..200.0.0.200", "200.0.0.210..200.0.0.255"],
      allocatableCount: 9,
    },
  );
});

const invalidCases = [
  ["a non-network CIDR", { cidr: "10.10.20.1/22" }, "cidr"],
  ["a CIDR without host addresses", { cidr: "10.10.20.0/31" }, "cidr"],
  ["a malformed starting address", { allocationStart: "10.10.20.256" }, "allocationStart"],
  ["a malformed ending address", { allocationEnd: "10.10.20.210.1" }, "allocationEnd"],
  ["a reversed window", { allocationEnd: "10.10.20.200" }, "allocationEnd"],
  ["a starting address outside the CIDR", { allocationStart: "10.10.19.255" }, "allocationStart"],
  ["an ending address outside the CIDR", { allocationEnd: "10.10.24.1" }, "allocationEnd"],
  [
    "a window starting at the network address",
    { allocationStart: "10.10.20.0" },
    "allocationStart",
  ],
  ["a window ending at the broadcast address", { allocationEnd: "10.10.23.255" }, "allocationEnd"],
  ["a malformed OVN gateway", { ovnGatewayIp: "invalid" }, "ovnGatewayIp"],
  ["a malformed upstream gateway", { upstreamGatewayIp: "invalid" }, "upstreamGatewayIp"],
  ["a gateway outside the CIDR", { upstreamGatewayIp: "10.10.24.1" }, "upstreamGatewayIp"],
  ["the network address as a gateway", { ovnGatewayIp: "10.10.20.0" }, "ovnGatewayIp"],
  [
    "the broadcast address as a gateway",
    { upstreamGatewayIp: "10.10.23.255" },
    "upstreamGatewayIp",
  ],
  ["identical gateways", { upstreamGatewayIp: input.ovnGatewayIp }, "ovnGatewayIp"],
  [
    "an OVN gateway outside the authorized window",
    { ovnGatewayIp: "10.10.20.200" },
    "ovnGatewayIp",
  ],
  [
    "a window consumed entirely by the OVN gateway",
    { allocationEnd: input.allocationStart },
    "allocationEnd",
  ],
] as const;

for (const [description, overrides, field] of invalidCases) {
  test(`rejects ${description}`, () => {
    assert.throws(
      () => buildAddressPool({ ...input, ...overrides }),
      (error: unknown) => error instanceof AddressPoolValidationError && error.field === field,
    );
  });
}
