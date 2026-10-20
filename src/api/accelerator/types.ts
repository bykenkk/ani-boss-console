export type GpuMode = "WHOLE_EXCLUSIVE" | "SHARED_FIXED";
export type GpuAdmission = "ADMISSION_OPEN" | "ADMISSION_CLOSED";
export type GpuProfileState = "PROFILE_ACTIVE" | "PROFILE_DISABLED" | "PROFILE_DELETED";

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
  volcano_version: string;
  volcano_image_digest: string;
  device_plugin_version: string;
  device_plugin_image_digest: string;
  hami_core_revision: string;
  memory_block_mib: number;
  memory_encoding: string;
  split_count: number;
  memory_scale_percent: number;
  core_scale_percent: number;
  core_budget_additive: boolean;
  node_config_digest: string;
  scheduler_config_digest: string;
  recipe_version: string;
  baseline_digest: string;
  runtime_class_name: string;
}
export interface GpuSupplyGroup {
  group_id: string;
  pool_id: string;
  cluster_id: string;
  display_name: string;
  mode: GpuMode;
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
  isolation_class: "SOFTWARE_COOPERATIVE" | "WHOLE_DEVICE_EXCLUSIVE";
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
  vendor_device_id: string;
  model_key: string;
  physical_memory_bytes: string;
  health: string;
  observation?: GpuObservation;
}
export interface GpuBinding {
  binding?: {
    binding_id: string;
    container_name: string;
    state: string;
    memory_mib: string;
    core_limit_percent: number;
    observation?: GpuObservation;
  };
  physical_device_id: string;
  cluster_id: string;
  pod_namespace: string;
  pod_name: string;
  pod_uid: string;
  evidence_ref: string;
  tenant_id?: string;
  owner_service?: string;
  resource_id?: string;
}
export interface GpuBindings extends GpuPage<GpuBinding> {
  observation?: GpuObservation;
}
export interface GpuDeviceCapacity {
  device_id: string;
  nominal_units: string;
  known_committed_units: string;
  known_free_units: string;
  safe_memory_budget_mib: string;
  committed_memory_mib: string;
  complete?: boolean;
  issues?: string[];
}
export interface GpuCapacity {
  profile_id: string;
  profile_version: string;
  mode: GpuMode;
  physical_device_count: string;
  nominal_units: string;
  known_committed_units: string;
  known_free_units: string;
  unplaced_requested_units: string;
  observation?: GpuObservation;
  devices?: GpuDeviceCapacity[];
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
  mode: GpuMode;
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
