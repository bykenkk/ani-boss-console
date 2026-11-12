import { policyLabel } from "../policy";
import type { GroupPolicyShape, SupplyGroupPolicy } from "@/api/accelerator";
interface PolicyShapeProps {
  shape: GroupPolicyShape;
  policy: SupplyGroupPolicy;
}
export function PolicyShape({ shape, policy }: PolicyShapeProps) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
      <div>策略：{policyLabel(policy)}</div>
      <div>
        业务类型：{shape.allocation_type} / {shape.mode}
      </div>
      <div>每份显存：{shape.memory_mib_per_device ?? "0"} MiB</div>
      <div>请求算力百分比：{shape.core_limit_percent ?? 0}%</div>
      <div>每份计算单元：{shape.compute_units_per_device ?? 0} CU</div>
      <div>每副本设备数量上限：{shape.max_devices_per_replica}</div>
      {shape.shares_per_physical_device === undefined ? null : (
        <div>每张物理卡份数：{shape.shares_per_physical_device}</div>
      )}
      {shape.memory_blocks_per_device === undefined ? null : (
        <div>每份插件显存块：{shape.memory_blocks_per_device}</div>
      )}
      {shape.unused_memory_mib_per_physical_device === undefined ? null : (
        <div>每卡取整余量：{shape.unused_memory_mib_per_physical_device} MiB</div>
      )}
      {shape.unused_core_percent_per_physical_device === undefined ? null : (
        <div>每卡算力余量：{shape.unused_core_percent_per_physical_device} 个百分点</div>
      )}
      {shape.native_memory_capacity_bytes === undefined ? null : (
        <div>原生每片显存：{shape.native_memory_capacity_bytes} bytes</div>
      )}
      <div className="col-span-2 break-all">
        资源键：{shape.resource_key} · 隔离类：{shape.isolation_class}
      </div>
    </div>
  );
}
