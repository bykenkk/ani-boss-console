import type { GpuCluster, GpuDiscoveredNode, GpuSupplyPreparationDraft } from "@/api/accelerator";

export function validGpuSupplyInteger(value: string | undefined, max: bigint): boolean {
  return Boolean(value && /^\d{1,20}$/.test(value) && BigInt(value) > 0n && BigInt(value) <= max);
}

export function validGpuSupplyResourceKey(value: string | undefined): boolean {
  if (!value || value.length > 317) return false;
  const parts = value.split("/");
  return (
    parts.length === 2 &&
    parts[0].length <= 253 &&
    parts[0]
      .split(".")
      .every(
        (part) =>
          part.length > 0 && part.length <= 63 && /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/.test(part),
      ) &&
    /^[A-Za-z0-9]([-_.A-Za-z0-9]*[A-Za-z0-9])?$/.test(parts[1]) &&
    parts[1].length <= 63
  );
}

export function gpuSupplyNodeCanPrepare(node: GpuDiscoveredNode, fixed: boolean): boolean {
  if (!node.node?.uid || !node.node.name || node.group_id) return false;
  const devices = node.devices ?? [];
  // 缺观测不能推断资源兼容；这里只准备交接内容，仍需运维核实，不能据此放行初始化。
  return (
    !devices.length ||
    devices.some(
      (device) =>
        (!device.adapter_id || device.adapter_id === "hygon-hcu-v1") &&
        (!device.device_kind ||
          device.device_kind === (fixed ? "FIXED_PARTITION_DEVICE" : "PHYSICAL_DEVICE")),
    )
  );
}

export function generateGpuSupplyPreparation(
  draft: GpuSupplyPreparationDraft,
  baselineId: string,
  cluster: GpuCluster,
  nodes: GpuDiscoveredNode[],
  discoveryRevision: string,
) {
  const fixed = draft.allocation_type === "FIXED_PARTITION";
  const bytes = fixed ? BigInt(draft.memory_capacity_bytes).toString() : "0";
  const registration = [
    {
      ref: draft.ref.trim(),
      display_name: draft.display_name.trim(),
      config: {
        baseline_id: baselineId,
        adapter_id: "hygon-hcu-v1",
        memory_block_mib: 0,
        split_count: 0,
        core_budget_additive: false,
        runtime_class_name: draft.runtime_class_name?.trim() ?? "",
        resource_types: [
          {
            allocation_type: fixed ? 3 : 1,
            resource_key: draft.resource_key.trim(),
            memory_capacity_bytes: bytes,
            compute_units_per_device: fixed ? Number(draft.compute_units_per_device) : 0,
            max_devices_per_replica: fixed ? 1 : Number(draft.max_devices_per_replica),
            max_memory_mib_per_device: 0,
          },
        ],
      },
    },
  ];
  // provider.json 是 Go 原生严格 JSON：枚举为数字，uint64 为精确数字 token。
  // 仅替换结构化字段的整行；不经 Number，用户字符串中的转义内容不会匹配。
  const config = JSON.stringify(registration, null, 2).replace(
    /^(\s+"memory_capacity_bytes": )"(\d+)"(,?)$/gm,
    "$1$2$3",
  );
  // 型号和证据只进入交接说明，严格 provider 配置不接受 model_key/evidence 扩展字段。
  const handoff = [
    "GPU 供给准备交接单（待应用，不表示登记完成）",
    `目标集群：${cluster.display_name}`,
    `目标连接：${cluster.connection_ref}`,
    `发现版本：${discoveryRevision}`,
    `拟登记引用：${draft.ref.trim()}`,
    `拟登记 ID：${baselineId}`,
    `供给类型：${fixed ? "海光固定分区（已有）" : "海光整卡"}`,
    `资源键：${draft.resource_key.trim()}`,
    "目标节点（应用前重新核对 UID 与归属）：",
    ...nodes
      .filter((node) => draft.node_uids.includes(node.node?.uid ?? ""))
      .map((node) => `  ${node.node!.name} / UID: ${node.node!.uid}`),
    `型号标识（Model Key）：${draft.model_source === "verified" ? draft.model_key.trim() : "待应用配置后由设备观测复检"}`,
    `参数来源：${draft.evidence.trim()}`,
    `固定分区显存（bytes）：${fixed ? bytes : "不适用（配置为 0）"}`,
    `固定分区计算单元（CU）：${fixed ? draft.compute_units_per_device : "不适用（配置为 0）"}`,
    "",
    "1. 核对节点 UID、设备来源、既有所有权和型号标签；已有不同标签时停止排查，不覆盖。",
    "2. 优先由 Obs 提供唯一规范型号；仍无法确定时，核实后补 accelerator.ani.io/model-key，不手工写供给组或基线归属标签。",
    "3. 备份当前配置，将供给条目合并到 provider.json 目标 connections 项的 provider_configs 数组；保留其他连接、API/TLS 地址、凭据路径与已有供给条目，不能替换完整文件。",
    "4. 按受管发布流程更新 ACC 实际读取的配置，并重启对应 ACC 装配，确认就绪；仅更新 ConfigMap 不代表已生效。",
    "5. 返回初始化并重新读取检查和节点发现结果，确认配置引用出现、型号可确定且节点 selectable=true 后继续。",
    "",
    "本交接单未应用到集群，不安装插件，不创建或切换分区。",
  ].join("\n");
  return { config, handoff };
}
