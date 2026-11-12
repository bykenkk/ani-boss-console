import { Alert, Button, Descriptions, Tooltip, Typography } from "@arco-design/web-react";
import { IconEdit } from "@arco-design/web-react/icon";
import type {
  GpuCluster,
  GpuDiscoveredNode,
  GpuInitializationInput,
  GpuProviderConfig,
} from "@/api/accelerator";
import { formatGpuAllocationType } from "../../capacity";
import type { GpuInitializationSupplyFacts } from "../supply-facts";
import type { NvidiaFixedProfile, NvidiaFixedProfilePreview } from "../nvidia-fixed-profile";

interface GpuInitializationSummaryProps {
  cluster: GpuCluster;
  input: GpuInitializationInput;
  poolName?: string;
  config?: GpuProviderConfig;
  nodes?: GpuDiscoveredNode[];
  facts?: GpuInitializationSupplyFacts;
  nvidiaProfile?: NvidiaFixedProfile;
  nvidiaProfileSource?: NvidiaFixedProfilePreview["source"];
  onEdit?: (step: 1 | 2 | 3) => void;
}

export function GpuInitializationSummary({
  cluster,
  input,
  poolName,
  config,
  nodes,
  facts,
  nvidiaProfile,
  nvidiaProfileSource,
  onEdit,
}: GpuInitializationSummaryProps) {
  const pool = input.pools[0];
  const group = input.groups[0].new_group;
  const profile = input.profiles[0];
  const observedNodes = facts?.nodes ?? nodes ?? [];
  const models = facts?.identity.modelKeys ?? [
    ...new Set(
      observedNodes.flatMap(
        (node) =>
          node.devices?.flatMap((device) => (device.model_key ? [device.model_key] : [])) ?? [],
      ),
    ),
  ];
  const adapter = facts?.identity.adapterId ?? config?.adapter_id;
  const nvidia = adapter
    ? adapter === "volcano-hami-mib-v1"
    : profile.resource_key === "volcano.sh/vgpu-number";
  const fixed = profile.allocation_type === "FIXED_PARTITION";
  const shared = profile.allocation_type === "DYNAMIC_SHARED";
  const physical = profile.allocation_type === "PHYSICAL";
  const sourceLabel = facts
    ? facts.source === "registration"
      ? "已登记供给配置"
      : facts.source === "observation"
        ? "实际供给查询"
        : "尚未取得供给事实"
    : "冻结提交内容（保持原请求）";
  const runtimeClass = facts?.registered?.baseline.runtime_class_name;
  const approvedMemory = facts?.registered?.resourceType.max_memory_mib_per_device;
  const memoryBlock =
    facts?.registered?.baseline.memory_block_mib ?? facts?.observed?.memoryBlockMiB;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Typography.Title heading={5} className="m-0! text-lg! font-medium!">
          确认本次初始化内容
        </Typography.Title>
        <Typography.Text type="secondary" className="text-xs!">
          核对 {cluster.display_name} 的资源关系、供给事实与本次申请策略，确认后提交后台任务。
        </Typography.Text>
      </div>
      <div className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
        <section className="min-w-0 border-b border-(--color-border-2) pb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Typography.Text bold>节点与供给</Typography.Text>
            {onEdit ? (
              <Button type="text" size="mini" icon={<IconEdit />} onClick={() => onEdit(1)}>
                修改节点
              </Button>
            ) : null}
          </div>
          <Descriptions
            column={1}
            data={[
              {
                label: "纳管节点",
                value: (
                  <Tooltip
                    content={group.nodes
                      .map((node) => node.name + "（" + node.uid + "）")
                      .join("、")}
                  >
                    <span className="break-all">
                      {group.nodes.map((node) => node.name).join("、")}
                    </span>
                  </Tooltip>
                ),
              },
              { label: "设备型号", value: models.join("、") || "未知：未返回设备型号" },
              { label: "适配器", value: adapter || "未知：冻结内容未包含适配器" },
              {
                label: "供给配置",
                value: <span className="break-all">{group.provider_config_ref}</span>,
              },
            ]}
          />
        </section>
        <section className="min-w-0 border-b border-(--color-border-2) pb-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Typography.Text bold>资源组织</Typography.Text>
            {onEdit ? (
              <Button type="text" size="mini" icon={<IconEdit />} onClick={() => onEdit(2)}>
                修改资源
              </Button>
            ) : null}
          </div>
          <Descriptions
            column={1}
            data={[
              {
                label: "资源池",
                value: (
                  <span className="break-all">
                    {pool.new_pool
                      ? pool.new_pool.display_name + " · 新建"
                      : (poolName ?? pool.existing_pool_id) + " · 复用"}
                  </span>
                ),
              },
              { label: "新供给组", value: group.display_name },
              { label: "调度队列", value: group.queue_name },
            ]}
          />
        </section>
        <section className="min-w-0 border-b border-(--color-border-2) pb-5 sm:col-span-2">
          <div className="mb-4 flex items-center justify-between gap-3">
            <Typography.Text bold>GPU 规格</Typography.Text>
            {onEdit ? (
              <Button type="text" size="mini" icon={<IconEdit />} onClick={() => onEdit(3)}>
                修改规格
              </Button>
            ) : null}
          </div>
          <Descriptions
            column={1}
            data={[
              { label: "规格名称", value: profile.display_name },
              {
                label: nvidia ? "供给方式" : "分配方式",
                value:
                  nvidia && shared ? "固定切片" : formatGpuAllocationType(profile.allocation_type),
              },
            ]}
          />
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="min-w-0 rounded-lg bg-(--color-fill-1) p-4">
              <Typography.Text bold>供给事实（只读）</Typography.Text>
              <Descriptions
                className="mt-3"
                column={1}
                data={[
                  { label: "参数来源", value: sourceLabel },
                  {
                    label: "资源类型键",
                    value: <span className="break-all">{profile.resource_key}</span>,
                  },
                  {
                    label: "登记设备上限",
                    value:
                      fixed || shared
                        ? "1 个设备 / 副本（此分配方式固定单设备）"
                        : facts?.registered
                          ? facts.registered.resourceType.max_devices_per_replica + " 个设备 / 副本"
                          : "未知：未返回登记详情",
                  },
                  {
                    label: "运行时",
                    value:
                      runtimeClass === undefined
                        ? "由已登记供给自动应用（详情未返回）"
                        : runtimeClass || "默认运行时",
                  },
                  ...(fixed
                    ? [
                        {
                          label: "固定片显存",
                          value: facts?.fixed
                            ? facts.fixed.bytes +
                              " bytes（向上换算 " +
                              facts.fixed.memoryMiB +
                              " MiB）"
                            : facts
                              ? "未知：尚未取得一致的真实固定片显存"
                              : profile.memory_mib_per_device +
                                " MiB（冻结提交值；原始 bytes 未知）",
                        },
                        {
                          label: "固定片计算单元",
                          value: facts
                            ? facts.fixed
                              ? facts.fixed.computeUnits + " CU"
                              : "未知：尚未取得一致的真实 CU"
                            : profile.compute_units_per_device + " CU（冻结提交值）",
                        },
                      ]
                    : []),
                  ...(nvidia
                    ? [
                        {
                          label: "已登记显存上限",
                          value:
                            approvedMemory === undefined
                              ? "未知：未返回登记预算"
                              : approvedMemory + " MiB / 设备",
                        },
                        {
                          label: "显存分配单位",
                          value:
                            memoryBlock === undefined ? "未知：接口尚未返回" : memoryBlock + " MiB",
                        },
                        ...(physical
                          ? [
                              {
                                label: "整卡规格显存",
                                value: facts
                                  ? facts.protocol.memoryMiBPerDevice === undefined
                                    ? "未知：需要已登记整卡预算"
                                    : facts.protocol.memoryMiBPerDevice + " MiB / 设备"
                                  : profile.memory_mib_per_device + " MiB / 设备（冻结提交值）",
                              },
                              { label: "整卡核心比例", value: profile.core_limit_percent + "%" },
                            ]
                          : []),
                      ]
                    : []),
                ]}
              />
            </div>
            <div className="min-w-0 rounded-lg bg-(--color-fill-1) p-4">
              <Typography.Text bold>本次申请策略</Typography.Text>
              <Descriptions
                className="mt-3"
                column={1}
                data={[
                  { label: "每副本最多申请", value: profile.max_devices_per_replica + " 个设备" },
                  ...(nvidia && shared
                    ? [
                        ...(nvidiaProfile
                          ? [
                              { label: "固定切片方案", value: nvidiaProfile.parts + " 等分" },
                              {
                                label: "规格计算来源",
                                value:
                                  nvidiaProfileSource === "registration"
                                    ? "已登记供给配置"
                                    : "当前供给查询（提交时按登记配置校验）",
                              },
                              {
                                label: "均分后显存余量",
                                value: nvidiaProfile.unusedMemoryMiB + " MiB / 卡",
                              },
                              {
                                label: "均分后算力余量",
                                value: nvidiaProfile.unusedCorePercent + "% / 卡",
                              },
                            ]
                          : []),
                        { label: "每份显存", value: profile.memory_mib_per_device + " MiB" },
                        { label: "每份算力限额", value: profile.core_limit_percent + "%" },
                      ]
                    : []),
                ]}
              />
              {fixed ? (
                <div className="mt-3 text-xs text-(--color-text-3)">
                  显存与 CU 由固定片类型确定，本次不修改分区。
                </div>
              ) : null}
              {physical && !nvidia ? (
                <div className="mt-3 text-xs text-(--color-text-3)">
                  整卡规格按设备数量申请，实际显存与计算单元见设备观测。
                </div>
              ) : null}
            </div>
          </div>
          {physical && !nvidia ? (
            <div className="mt-4">
              <Typography.Text bold>设备观测（只读）</Typography.Text>
              <div className="mt-2 flex flex-col gap-2 text-xs text-(--color-text-3)">
                {observedNodes.some((node) => node.devices?.length) ? (
                  observedNodes.flatMap(
                    (node, nodeIndex) =>
                      node.devices?.map((device, deviceIndex) => (
                        <div
                          key={
                            (node.node?.uid ?? nodeIndex) + ":" + (device.device_uid || deviceIndex)
                          }
                          className="break-all"
                        >
                          {node.node?.name || "未知节点"} · {device.device_uid || "未知设备"}： 显存{" "}
                          {device.memory_capacity_bytes == null
                            ? "未知"
                            : device.memory_capacity_bytes + " bytes"}
                          ， CU {device.compute_units == null ? "未知" : device.compute_units}
                        </div>
                      )) ?? [],
                  )
                ) : (
                  <div>未知：本次没有设备观测明细，冻结请求不包含硬件容量。</div>
                )}
              </div>
            </div>
          ) : null}
          {facts?.notes.length || facts?.issues.length ? (
            <div className="mt-4 flex flex-col gap-1 text-xs text-(--color-text-3)">
              {[...new Set([...(facts?.issues ?? []), ...(facts?.notes ?? [])])].map((note) => (
                <div key={note}>{note}</div>
              ))}
            </div>
          ) : null}
        </section>
      </div>
      <Alert
        type="info"
        title="确认后开始初始化"
        content="将按上述资源关系创建供给组和 GPU 规格，并纳管所选节点。提交后可在任务中查看执行进度。"
      />
    </div>
  );
}
