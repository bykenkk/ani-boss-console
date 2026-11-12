import type { SupplyGroupPolicy } from "./types-group-policy";
import type { PageParams } from "@/api/types";

export type GpuMode = "WHOLE_EXCLUSIVE" | "SHARED_FIXED";
export type GpuAllocationType = "PHYSICAL" | "DYNAMIC_SHARED" | "FIXED_PARTITION";
export type GpuAdmission = "ADMISSION_OPEN" | "ADMISSION_CLOSED";
export type GpuProfileState = "PROFILE_ACTIVE" | "PROFILE_DISABLED" | "PROFILE_DELETED";
export type GpuDeviceKind = "PHYSICAL_DEVICE" | "FIXED_PARTITION_DEVICE";
export type GpuCapacityBasis = "NATIVE_ALLOCATION" | "BOUND_POD_REQUEST";
export type GpuCapacityGranularity = "DEVICE" | "NODE_RESOURCE";

// TODO(pagination-migration): 后端支持 page/pageSize 和 items/total 后迁移；当前保留 page_size/page_token，不伪造 total 或遍历汇总分页。
export interface GpuPageParams {
  page_size?: number;
  page_token?: string;
}
export interface GpuPage<T> {
  items?: T[];
  next_page_token?: string;
}
export interface GpuObservation {
  complete?: boolean;
  observed_at?: string;
  issues?: string[];
}
export interface GpuNode {
  uid: string;
  name: string;
}
export interface GpuCluster {
  cluster_id: string;
  display_name: string;
  connection_ref: string;
  version: string;
}
export interface GpuPool {
  pool_id: string;
  cluster_id: string;
  display_name: string;
}
export interface GpuBaseline {
  baseline_id: string;
  adapter_id: string;
  memory_block_mib: number;
  split_count: number;
  core_budget_additive?: boolean;
  runtime_class_name: string;
  resource_types: GpuResourceTypeConfig[];
}
export interface GpuResourceTypeConfig {
  allocation_type: GpuAllocationType;
  resource_key: string;
  memory_capacity_bytes: string;
  compute_units_per_device: number;
  max_devices_per_replica: number;
  max_memory_mib_per_device: string;
}
export interface GpuSupplyGroup {
  provider_config_ref?: string;
  provider_config_version?: string;
  policy?: SupplyGroupPolicy;
  group_id: string;
  pool_id: string;
  cluster_id: string;
  display_name: string;
  nodes?: GpuNode[];
  model_key: string;
  baseline?: GpuBaseline;
  admission: GpuAdmission;
  queue_name: string;
  version: string;
  adopted_at?: string;
}
export interface GpuProfileSpec {
  group_id: string;
  mode: GpuMode;
  model_key: string;
  memory_mib_per_device: string;
  core_limit_percent: number;
  max_devices_per_replica: number;
  isolation_class: "SOFTWARE_COOPERATIVE" | "WHOLE_DEVICE_EXCLUSIVE" | "FIXED_PARTITION_EXCLUSIVE";
  allocation_type: GpuAllocationType;
  resource_key: string;
  compute_units_per_device: number;
}
export interface GpuProfile {
  profile_id: string;
  profile_version: string;
  display_name: string;
  spec: GpuProfileSpec;
  state: GpuProfileState;
  revision: string;
}
export interface GpuProfilePreview {
  spec: GpuProfileSpec;
  unused_memory_mib: string;
  unused_core_units: number;
}
export interface GpuDevice {
  device_id: string;
  cluster_id: string;
  group_id: string;
  node?: GpuNode;
  model_key: string;
  health: string;
  observation?: GpuObservation;
  device_uid: string;
  parent_device_uid: string;
  device_kind: GpuDeviceKind;
  memory_capacity_bytes?: string;
  compute_units?: number;
  pci_bdf: string;
  adapter_id: string;
  resource_key: string;
}
// Unknown observations remain null; a known zero is the decimal string "0".
export interface GpuCapacityTotals {
  total_units: string | null;
  allocated_units: string | null;
  unallocated_units: string | null;
  total_memory_mib: string | null;
  allocated_memory_mib: string | null;
  unallocated_memory_mib: string | null;
}
export interface GpuCapacityDetail {
  node_uid: string;
  node_name: string;
  device_uid: string;
  totals: GpuCapacityTotals;
  nominal_units: string | null;
  estimated_available_units: string | null;
}
export interface GpuProfileCapacity {
  profile_id: string;
  profile_version: string;
  allocation_type: GpuAllocationType;
  resource_key: string;
  basis: GpuCapacityBasis;
  granularity: GpuCapacityGranularity;
  nominal_units: string | null;
  estimated_available_units: string | null;
  totals: GpuCapacityTotals;
  details: GpuCapacityDetail[];
  observed_at: string;
  missing_fields: string[];
}
export interface GpuResourceTypeCapacity {
  allocation_type: GpuAllocationType;
  resource_key: string;
  basis: GpuCapacityBasis;
  granularity: GpuCapacityGranularity;
  totals: GpuCapacityTotals;
  details: GpuCapacityDetail[];
  observed_at: string;
  missing_fields: string[];
}
export interface GpuSupplyGroupCapacity {
  group_id: string;
  physical_device_count: string | null;
  resource_types: GpuResourceTypeCapacity[];
  observed_at: string;
}
export interface RegisterGpuClusterInput {
  display_name: string;
  connection_ref: string;
}
export interface CreateGpuPoolInput {
  cluster_id: string;
  display_name: string;
}
export interface AdoptGpuSupplyInput {
  display_name: string;
  pool_id: string;
  nodes: GpuNode[];
  model_key: string;
  baseline: GpuBaseline;
  queue_name: string;
}
export interface CreateGpuProfileInput {
  display_name: string;
  expected_group_version: string;
  spec: GpuProfileSpec;
}
export interface SetGpuAdmissionInput {
  group_id: string;
  expected_version: string;
  desired: GpuAdmission;
  reason: string;
}
export interface SetGpuProfileStateInput {
  profile_id: string;
  expected_revision: string;
  desired: Exclude<GpuProfileState, "PROFILE_DELETED">;
}
export interface DeleteGpuProfileInput {
  profile_id: string;
  expected_revision: string;
}

export interface GpuProviderConfig {
  provider_config_ref: string;
  adapter_id: string;
  allocation_types?: GpuAllocationType[];
}

export interface GpuDiscoveredNode {
  node?: GpuNode;
  group_id?: string;
  selectable?: boolean;
  blocking_reasons?: string[];
  devices?: Array<
    Partial<Omit<GpuDevice, "memory_capacity_bytes" | "compute_units">> & {
      memory_capacity_bytes?: string | null;
      compute_units?: number | null;
    }
  >;
  provider_configs?: GpuProviderConfig[];
}

export interface GpuDiscoveredNodes {
  items?: GpuDiscoveredNode[];
  total?: string;
  discovery_revision?: string;
}

export interface GpuDiscoveryParams extends PageParams {
  connection_ref: string;
}

export interface GpuInitializationCheck {
  key?: string;
  source?: string;
  state?: string;
  reason?: string;
}

// 本地供给准备草稿，不是初始化 HTTP 请求体；尚无供给配置保存/应用接口。
export interface GpuSupplyPreparationDraft {
  allocation_type: Exclude<GpuAllocationType, "DYNAMIC_SHARED">;
  node_uids: string[];
  model_source: "observation" | "verified";
  model_key: string;
  evidence: string;
  ref: string;
  display_name: string;
  resource_key: string;
  max_devices_per_replica: string;
  memory_capacity_bytes: string;
  compute_units_per_device: string;
  runtime_class_name: string;
}

export interface GpuInitialization {
  registered?: boolean;
  connection_ref?: string;
  cluster_id?: string;
  display_name?: string;
  configuration_state?: string;
  configuration_complete?: boolean;
  checks?: GpuInitializationCheck[];
  latest_operation?: GpuInitializationOperation;
}

export interface GpuInitializationStep {
  step_id?: string;
  object_key?: string;
  kind?: string;
  state?: string;
  resource_id?: string;
  input_group_version?: string;
  output_group_version?: string;
  reason?: string;
}

export interface GpuInitializationOperation {
  operation_id?: string;
  version?: string;
  state?: string;
  created_at?: string;
  updated_at?: string;
  current_step?: string;
  retryable?: boolean;
  reason?: string;
  required_actions?: string[];
  cluster_id?: string;
  pools?: Array<{ client_key?: string; pool_id?: string }>;
  groups?: Array<{
    client_key?: string;
    group_id?: string;
    recorded_group_version?: string;
    auto_open_result?: string;
    admission?: string;
  }>;
  profiles?: Array<{
    client_key?: string;
    profile_id?: string;
    recorded_revision?: string;
    recorded_state?: string;
  }>;
  steps?: GpuInitializationStep[];
}

export interface GpuInitializationProfileInput {
  client_key: string;
  group_key: string;
  display_name: string;
  memory_mib_per_device: string;
  core_limit_percent: number;
  max_devices_per_replica: number;
  allocation_type: GpuAllocationType;
  resource_key: string;
  compute_units_per_device: number;
}

export interface GpuInitializationInput {
  connection_ref: string;
  discovery_revision: string;
  pools: Array<
    { client_key: string } & (
      | { new_pool: { display_name: string }; existing_pool_id?: never }
      | { existing_pool_id: string; new_pool?: never }
    )
  >;
  groups: Array<{
    client_key: string;
    new_group: {
      pool_key: string;
      display_name: string;
      nodes: GpuNode[];
      provider_config_ref: string;
      queue_name: string;
    };
  }>;
  profiles: GpuInitializationProfileInput[];
}

export interface RetryGpuInitializationInput {
  operation_id: string;
  expected_version: string;
}

export interface CreateGpuInitializationRequest {
  data: GpuInitializationInput & { idempotency_key: string };
}

export interface RetryGpuInitializationRequest {
  data: { expected_version: string; idempotency_key: string };
}
