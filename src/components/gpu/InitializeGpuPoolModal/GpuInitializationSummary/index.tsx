import { Alert, Button, Descriptions, Tooltip, Typography } from "@arco-design/web-react";
import { IconEdit } from "@arco-design/web-react/icon";
import type {
  GpuCluster,
  GpuDiscoveredNode,
  GpuInitializationInput,
  GpuProviderConfig,
} from "@/api/accelerator";
import { formatGpuAllocationType } from "../../capacity";

interface GpuInitializationSummaryProps {
  cluster: GpuCluster;
  input: GpuInitializationInput;
  poolName?: string;
  config?: GpuProviderConfig;
  nodes?: GpuDiscoveredNode[];
  onEdit?: (step: 1 | 2 | 3) => void;
}

export function GpuInitializationSummary({
  cluster,
  input,
  poolName,
  config,
  nodes,
  onEdit,
}: GpuInitializationSummaryProps) {
  const pool = input.pools[0];
  const group = input.groups[0].new_group;
  const profile = input.profiles[0];
  const models = [
    ...new Set(
      nodes?.flatMap(
        (node) => node.devices?.map((device) => device.model_key).filter(Boolean) ?? [],
      ),
    ),
  ].join("、");
  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-1">
        <Typography.Title heading={5} className="m-0! text-lg! font-medium!">
          确认本次初始化内容
        </Typography.Title>
        <Typography.Text type="secondary" className="text-xs!">
          核对 {cluster.display_name} 的资源关系和规格上限，确认后提交后台任务。
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
                    content={group.nodes.map((node) => `${node.name}（${node.uid}）`).join("、")}
                  >
                    <span className="break-all">
                      {group.nodes.map((node) => node.name).join("、")}
                    </span>
                  </Tooltip>
                ),
              },
              { label: "设备型号", value: models || "待观测" },
              { label: "适配器", value: config?.adapter_id || "-" },
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
                      ? `${pool.new_pool.display_name} · 新建`
                      : `${poolName ?? pool.existing_pool_id} · 复用`}
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
              { label: "分配方式", value: formatGpuAllocationType(profile.allocation_type) },
              {
                label: "资源类型键",
                value: <span className="break-all">{profile.resource_key}</span>,
              },
            ]}
          />
          <div className="mt-4 grid grid-cols-2 gap-4 rounded-lg bg-(--color-fill-1) px-4 py-3 sm:grid-cols-4">
            {[
              { label: "每副本最多", value: `${profile.max_devices_per_replica} 个设备` },
              { label: "每设备显存", value: `${profile.memory_mib_per_device} MiB` },
              { label: "每设备 CU", value: profile.compute_units_per_device },
              { label: "核心比例", value: `${profile.core_limit_percent}%` },
            ].map((limit) => (
              <div key={limit.label} className="flex min-w-0 flex-col gap-1">
                <span className="text-xs text-(--color-text-3)">{limit.label}</span>
                <span className="break-all font-medium">{limit.value}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
      <Alert
        type="info"
        title="本次初始化可能同步节点标签，并开启新供给组接单。"
        content="任务受理后继续在后台执行，不提供取消或自动回滚。目录初始化完成后，实机计算与监控需另行验收。"
      />
    </div>
  );
}
