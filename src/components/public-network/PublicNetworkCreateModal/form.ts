import type { CreatePublicNetworkInput } from "@/api/platform-networks";
import { buildAddressPool, type PublicAddressPoolInput } from "./address-pool.ts";

export interface PublicNetworkCreateFormValues {
  name: string;
  description?: string;
  vlanId: string;
  cidr: string;
  allocationStart: string;
  allocationEnd: string;
  upstreamGateway: string;
  ovnGateway: string;
}

export function getAddressPoolInput(
  values: Partial<PublicNetworkCreateFormValues>,
): PublicAddressPoolInput {
  return {
    cidr: values.cidr ?? "",
    allocationStart: values.allocationStart ?? "",
    allocationEnd: values.allocationEnd ?? "",
    ovnGatewayIp: values.ovnGateway ?? "",
    upstreamGatewayIp: values.upstreamGateway ?? "",
  };
}

export function buildPublicNetworkInput(
  values: PublicNetworkCreateFormValues,
): CreatePublicNetworkInput {
  const pool = buildAddressPool(getAddressPoolInput(values));
  return {
    name: values.name.trim(),
    description: values.description?.trim(),
    mode: "underlay",
    vlan_network_id: values.vlanId,
    cidr: values.cidr.trim(),
    ovn_gateway_ip: values.ovnGateway.trim(),
    upstream_gateway_ip: values.upstreamGateway.trim(),
    excluded_ips: pool.excludedIps,
  };
}
