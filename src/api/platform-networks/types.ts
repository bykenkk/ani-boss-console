export type PlatformNetworkKind = "vlan-networks" | "public-address-pools";
export interface PlatformNetworkListParams {
  name?: string;
  state?: string;
  limit?: number;
  cursor?: string;
}
export interface PublicPoolVerification {
  provider_source_revision: string;
  provider_image_digests: string[];
  topology_fingerprint: string;
  evidence_reference: string;
  scope: string;
  verified_at?: string;
  expires_at?: string;
}
export interface PlatformNetwork {
  id: string;
  cluster_id: string;
  name: string;
  description: string;
  state: string;
  reason: string;
  reason_message: string;
  version: string;
  created_at?: string;
  updated_at?: string;
  observed_at?: string;
  observation_stale: boolean;
  last_operation_id: string;
  vlan?: {
    device_id: string;
    vlan_id: number;
    virtual_switch_id: string;
    device_name: string;
    group_name: string;
    nodes: import("@/api/virtual-switches").VirtualSwitchNode[];
  };
  pool?: {
    mode: string;
    gateway_id: string;
    cidr: string;
    ovn_gateway_ip: string;
    excluded_ips: string[];
    vlan_network_id: string;
    upstream_gateway_ip: string;
    allocation_enabled: boolean;
    is_default: boolean;
    config_revision: string;
    verification?: PublicPoolVerification;
    topology_fingerprint: string;
    observed_provider_images: string[];
    scope: string;
  };
}
export interface PlatformNetworkList {
  items: PlatformNetwork[];
  next_cursor: string;
  total: string;
}
export interface PublicPoolVerificationInput {
  expected_version: string;
  verification: PublicPoolVerification;
}
export interface PublicPoolAllocationInput {
  expected_version: string;
  enabled: boolean;
}
export interface CreateLayer2NetworkInput {
  name: string;
  description?: string;
  cluster_id: string;
  virtual_switch_id: string;
  device_name: string;
  vlan_id: number;
}
export interface CreatePublicNetworkInput {
  name: string;
  description?: string;
  mode: "underlay";
  vlan_network_id: string;
  cidr: string;
  ovn_gateway_ip: string;
  upstream_gateway_ip: string;
  excluded_ips: string[];
}
