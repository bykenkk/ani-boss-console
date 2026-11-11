import {
  Alert,
  Divider,
  Form,
  Input,
  Radio,
  Select,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  acceleratorKeys,
  listGpuPools,
  type GpuProviderConfig,
  type GpuDiscoveredNode,
} from "@/api/accelerator";
import { withId } from "@/lib/id";
import styles from "../../initialization.module.less";

interface GpuPoolOrganizationProps {
  clusterId: string;
  poolMode: "new" | "existing";
  configs: GpuProviderConfig[];
  nodes: GpuDiscoveredNode[];
  onExistingPoolChange: (name?: string) => void;
}

export function GpuPoolOrganization({
  clusterId,
  poolMode,
  configs,
  nodes,
  onExistingPoolChange,
}: GpuPoolOrganizationProps) {
  // TODO(pagination-migration): 当前 Gov 池列表仅支持游标；选项只取首 100 项，页码合同补齐后迁移。
  const pools = useQuery({
    queryKey: [...acceleratorKeys.all, "pools", clusterId, "options"],
    queryFn: ({ signal }) => listGpuPools({ cluster_id: clusterId, page_size: 100 }, signal),
    enabled: poolMode === "existing",
    meta: {
      errorNotification: {
        id: withId("gpu-pool-options", clusterId),
        action: "GPU 资源池选项加载",
      },
    },
  });
  return (
    <div>
      <div className="mb-5 flex flex-col gap-1">
        <Typography.Title heading={5} className="m-0! text-lg! font-medium!">
          组织资源池与供给组
        </Typography.Title>
        <Typography.Text type="secondary" className="text-xs!">
          资源池承载多个供给组，本次先创建一个供给组。
        </Typography.Text>
      </div>
      <Form.Item field="pool_mode">
        <Radio.Group className="grid! grid-cols-1 gap-3 sm:grid-cols-2">
          {[
            { value: "new", title: "新建资源池", description: "为这组 GPU 建立独立资源池" },
            { value: "existing", title: "使用已有资源池", description: "加入当前集群已有的资源池" },
          ].map((option) => (
            <Radio
              key={option.value}
              value={option.value}
              className={clsx(
                styles.poolChoice,
                "m-0! flex! min-w-0 items-start! rounded-lg border border-solid p-4",
                poolMode === option.value
                  ? "border-[rgb(var(--primary-6))] bg-[rgb(var(--primary-1))]"
                  : "border-(--color-border-2)",
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <span className="text-sm font-medium">{option.title}</span>
                <span className="text-xs text-(--color-text-3)">{option.description}</span>
              </div>
            </Radio>
          ))}
        </Radio.Group>
      </Form.Item>
      {poolMode === "new" ? (
        <Form.Item
          field="pool_name"
          label="资源池名称"
          rules={[{ required: true, match: /\S/, message: "请输入资源池名称" }]}
        >
          <Input placeholder="请输入资源池名称" />
        </Form.Item>
      ) : (
        <>
          <Form.Item
            field="existing_pool_id"
            label="已有资源池"
            rules={[{ required: true, message: "请选择资源池" }]}
            extra="仅展示当前集群的前 100 个资源池。"
          >
            <Select
              filterOption={false}
              loading={pools.isFetching}
              placeholder="请选择已有资源池"
              options={(pools.data?.items ?? []).map((pool) => ({
                label: pool.display_name,
                value: pool.pool_id,
              }))}
              onChange={(poolId: string) =>
                onExistingPoolChange(
                  pools.data?.items?.find((pool) => pool.pool_id === poolId)?.display_name,
                )
              }
              onVisibleChange={(visible) => {
                if (visible && !pools.isFetching) pools.refetch();
              }}
            />
          </Form.Item>
          {pools.data?.next_page_token ? (
            <Alert content="资源池超过 100 项，后续选项暂不可见。" />
          ) : null}
        </>
      )}
      <Divider className="my-6!" />
      <div className="mb-4 flex flex-col gap-1">
        <Typography.Text bold>新建供给组</Typography.Text>
        <Typography.Text type="secondary" className="text-xs!">
          本次将选中的 {nodes.length} 个节点纳入一个新供给组。
        </Typography.Text>
      </div>
      <div className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        <Form.Item
          field="group_name"
          label="新供给组名称"
          rules={[{ required: true, match: /\S/, message: "请输入供给组名称" }]}
        >
          <Input placeholder="请输入新供给组名称" />
        </Form.Item>
        <Form.Item
          field="provider_config_ref"
          label="受管供给配置"
          rules={[{ required: true, message: "请选择共同支持的供给配置" }]}
          extra="来自所选节点共同支持的配置。"
        >
          <Select
            filterOption={false}
            placeholder="请选择受管供给配置"
            options={configs.map((config) => ({
              label: `${config.provider_config_ref} · ${config.adapter_id}`,
              value: config.provider_config_ref,
            }))}
          />
        </Form.Item>
        <Form.Item
          field="queue_name"
          label="Volcano 调度队列"
          rules={[
            { required: true, message: "请输入既有调度队列名称" },
            {
              match: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
              maxLength: 63,
              message: "请输入合法的调度队列名称",
            },
          ]}
          extra="引用运维已准备的队列。"
        >
          <Input placeholder="请输入运维提供的队列名称" />
        </Form.Item>
        <div className="flex flex-col gap-2 text-xs">
          <Typography.Text className="text-[13px]! font-medium!">纳管节点</Typography.Text>
          <div className="flex flex-wrap gap-2">
            {nodes.map((node) => (
              <Tag key={node.node!.uid}>{node.node!.name}</Tag>
            ))}
          </div>
          <Typography.Text type="secondary" className="text-xs!">
            {nodes.length} 个节点 · 同一供给组
          </Typography.Text>
        </div>
      </div>
      {!configs.length ? (
        <Alert
          type="warning"
          content="所选节点没有共同支持的供给配置，请返回调整节点或由运维补齐配置。"
        />
      ) : null}
    </div>
  );
}
