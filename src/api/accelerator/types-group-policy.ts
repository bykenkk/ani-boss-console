import type { GpuNode } from "./types";
import type { PageParams } from "@/api/types";

export type SupplySourceKind = "PLUGIN" | "NATIVE_WHOLE" | "NATIVE_FIXED_PARTITION";
export type SupplyAllocationType = "PHYSICAL" | "DYNAMIC_SHARED" | "FIXED_PARTITION";
export type SupplyGroupPolicy =
  | { policy_kind: "WHOLE" }
  | { policy_kind: "EQUAL_SHARE"; parts: 2 | 4 | 8 }
  | {
      policy_kind: "NATIVE_RESOURCE";
      resource_key: string;
      native_allocation_type: "PHYSICAL" | "FIXED_PARTITION";
    };
export interface SupplyFactSource {
  field: string;
  source: string;
  ref?: string;
}
export interface SupplyDeviceIdentity {
  device_uid: string;
  device_kind: string;
  parent_device_uid?: string;
  memory_capacity_bytes?: string;
  compute_units?: number;
}
export interface SupplyCandidate {
  candidate_id: string;
  node: GpuNode;
  adapter_id: string;
  allocation_type?: string;
  source_kind: SupplySourceKind;
  resource_key: string;
  model_key: string;
  device_uids?: string[];
  devices?: SupplyDeviceIdentity[];
  memory_capacity_bytes?: string;
  compute_units_per_device?: number;
  memory_block_mib?: number;
  split_count?: number;
  core_budget_additive?: boolean;
  max_memory_mib_per_device?: string;
  runtime_class_name?: string;
  runtime_class_candidates?: string[];
  resource_mapping_required?: boolean;
  sources?: SupplyFactSource[];
  missing_fields?: string[];
  blocking_reasons?: string[];
}
export interface InitializationCheck {
  key: string;
  source: string;
  state: string;
  reason?: string;
}
export interface SupplyCandidates {
  connection_ref: string;
  items?: SupplyCandidate[];
  total: string;
  discovery_revision: string;
  checks?: InitializationCheck[];
}
export interface SupplyDeclaration {
  field: string;
  value: string;
  source: string;
}
export interface SupplyRegistrationInput {
  client_key: string;
  candidate_ids: string[];
  display_name: string;
  whole_max_devices_per_replica?: number;
  max_devices_per_replica?: number;
  runtime_class_name?: string;
  declarations?: SupplyDeclaration[];
  resource_mapping_confirmed?: boolean;
  resource_mapping_source?: string;
}
export interface RegisterSupplyConfigurationInput {
  connection_ref: string;
  discovery_revision: string;
  registrations: SupplyRegistrationInput[];
}
export interface RegisteredSupplyConfiguration {
  registration_id: string;
  client_key: string;
  connection_ref: string;
  provider_config_ref: string;
  version: string;
  display_name: string;
  nodes?: GpuNode[];
  model_key: string;
  baseline?: Record<string, unknown>;
  candidates?: SupplyCandidate[];
  declarations?: SupplyDeclaration[];
  resource_mapping_source?: string;
  created_at?: string;
  capability?: { source_kind: SupplySourceKind; whole_max_devices_per_replica?: number };
}
export interface SupplyRegistrationResult {
  registration_id: string;
  connection_ref: string;
  created_at?: string;
  configurations?: RegisteredSupplyConfiguration[];
}
export interface DiscoveredProviderConfig {
  provider_config_ref: string;
  adapter_id: string;
  allocation_types?: string[];
  source_kind?: SupplySourceKind;
  provider_config_version: string;
}
export interface DiscoveredSupplyNode {
  node: GpuNode;
  group_id?: string;
  selectable: boolean;
  blocking_reasons?: string[];
  devices?: SupplyDeviceIdentity[];
  provider_configs?: DiscoveredProviderConfig[];
}
export interface DiscoveredNodes {
  items?: DiscoveredSupplyNode[];
  total: string;
  discovery_revision: string;
}
export interface GroupPolicyShape {
  allocation_type: SupplyAllocationType;
  mode: string;
  resource_key: string;
  isolation_class: string;
  memory_mib_per_device: string;
  core_limit_percent: number;
  compute_units_per_device: number;
  max_devices_per_replica: number;
  shares_per_physical_device?: number;
  unused_memory_mib_per_physical_device?: string;
  unused_core_percent_per_physical_device?: number;
  memory_blocks_per_device?: string;
  native_memory_capacity_bytes?: string;
}
export interface SupplyGroupPolicyOption {
  policy: SupplyGroupPolicy;
  selectable: boolean;
  blocking_reasons?: string[];
  missing_fields?: string[];
  shape?: GroupPolicyShape;
}
export interface PreviewSupplyGroupPolicyInput {
  connection_ref: string;
  provider_config_ref: string;
  provider_config_version: string;
  nodes: GpuNode[];
  discovery_revision: string;
}
export interface SupplyGroupPolicyPreview {
  connection_ref: string;
  provider_config_ref: string;
  provider_config_version: string;
  discovery_revision: string;
  options?: SupplyGroupPolicyOption[];
}
export interface CreateInitializationInput {
  connection_ref: string;
  discovery_revision: string;
  pools: Array<
    { client_key: string } & ({ new_pool: { display_name: string } } | { existing_pool_id: string })
  >;
  groups: Array<
    { client_key: string } & (
      | {
          new_group: {
            pool_key: string;
            display_name: string;
            nodes: GpuNode[];
            queue_name: string;
            provider_config_ref: string;
            provider_config_version: string;
            policy: SupplyGroupPolicy;
          };
        }
      | { existing_group: { group_id: string; expected_version: string } }
    )
  >;
  profiles: Array<
    { client_key: string; group_key: string; display_name: string } & (
      | { derive_from_group_policy: true }
      | {
          allocation_type: SupplyAllocationType;
          resource_key: string;
          memory_mib_per_device: string;
          core_limit_percent: number;
          max_devices_per_replica: number;
          compute_units_per_device: number;
        }
    )
  >;
}
export interface InitializationOperation {
  operation_id: string;
  version: string;
  state: "ACCEPTED" | "RUNNING" | "SUCCEEDED" | "BLOCKED" | "CONFLICT" | "FAILED";
  created_at?: string;
  updated_at?: string;
  current_step?: string;
  retryable?: boolean;
  reason?: string;
  required_actions?: string[];
  cluster_id?: string;
  pools?: Array<{ client_key: string; pool_id: string }>;
  groups?: Array<{
    client_key: string;
    group_id: string;
    admission?: string;
    auto_open_result?: string;
    recorded_group_version: string;
  }>;
  profiles?: Array<{
    client_key: string;
    profile_id: string;
    recorded_revision: string;
    recorded_state?: string;
  }>;
  steps?: Array<{
    step_id: string;
    object_key: string;
    kind: string;
    state: string;
    resource_id?: string;
    reason?: string;
  }>;
}
export interface InitializationStatus {
  registered: boolean;
  connection_ref: string;
  cluster_id?: string;
  display_name?: string;
  configuration_state?: string;
  configuration_complete?: boolean;
  checks?: InitializationCheck[];
  latest_operation?: InitializationOperation;
}
export type SupplyPageParams = PageParams & { connection_ref: string };
