import {
  Alert,
  Button,
  Divider,
  Form,
  Input,
  Radio,
  Select,
  Tag,
  Typography,
} from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import {
  acceleratorKeys,
  listGpuPools,
  type GpuProviderConfig,
  type GpuDiscoveredNode,
} from "@/api/accelerator";
import { listGpuVolcanoQueueOptions } from "@/api/accelerator/volcano-queues";
import { withId } from "@/lib/id";
import { formatGpuAllocationType } from "../../capacity";
import styles from "../../initialization.module.less";

interface GpuPoolOrganizationProps {
  clusterId: string;
  poolMode: "new" | "existing";
  configs: GpuProviderConfig[];
  nodes: GpuDiscoveredNode[];
  onExistingPoolChange: (name?: string) => void;
}

function ReadonlyOptionValue({
  value,
  options,
}: {
  value?: string;
  options: Array<{ value: string; label: string; detail?: string }>;
}) {
  const option = options.find((item) => item.value === value);
  return (
    <div className="flex min-h-9 flex-col justify-center gap-1">
      <span>{option?.label ?? "正在匹配已查询选项"}</span>
      {option?.detail ? (
        <span className="break-all text-xs text-(--color-text-3)">{option.detail}</span>
      ) : null}
    </div>
  );
}

function supplyLabel(config: GpuProviderConfig) {
  const nvidia = config.adapter_id === "volcano-hami-mib-v1";
  const types = config.allocation_types?.map((type) =>
    nvidia && type === "DYNAMIC_SHARED" ? "固定切片" : formatGpuAllocationType(type),
  );
  return `${config.adapter_id === "hygon-hcu-v1" ? "海光" : nvidia ? "NVIDIA" : config.adapter_id} · ${types?.join(" / ") || "供给类型待确认"}`;
}

export function GpuPoolOrganization({
  clusterId,
  poolMode,
  configs,
  nodes,
  onExistingPoolChange,
}: GpuPoolOrganizationProps) {
  const { form } = Form.useFormContext();
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
  const queues = useQuery({
    queryKey: [...acceleratorKeys.all, "volcano-queue-options", clusterId],
    queryFn: ({ signal }) => listGpuVolcanoQueueOptions(clusterId, signal),
    enabled: Boolean(clusterId),
    meta: {
      errorNotification: {
        id: withId("gpu-volcano-queue-options", clusterId),
        action: "Volcano 调度队列加载",
      },
    },
  });
  const availableQueues = queues.data?.items.filter((queue) => queue.available) ?? [];
  const uniqueQueue = !queues.isError && !queues.data?.hasMore && availableQueues.length === 1;
  const uniquePool =
    !pools.isError && !pools.data?.next_page_token && pools.data?.items?.length === 1;
  useEffect(() => {
    if (poolMode !== "existing" || !pools.isSuccess || pools.isFetching) return;
    const items = pools.data.items ?? [];
    const selected = items.find((pool) => pool.pool_id === form.getFieldValue("existing_pool_id"));
    if (selected) {
      onExistingPoolChange(selected.display_name);
    } else if (!pools.data.next_page_token && items.length === 1) {
      form.setFieldsValue({ existing_pool_id: items[0].pool_id });
      onExistingPoolChange(items[0].display_name);
    } else {
      form.setFieldsValue({ existing_pool_id: undefined });
      onExistingPoolChange(undefined);
    }
  }, [poolMode, pools.isSuccess, pools.isFetching, pools.data, form, onExistingPoolChange]);
  useEffect(() => {
    if (!queues.data || queues.isError || queues.isFetching) return;
    const available = queues.data.items.filter((queue) => queue.available);
    if (available.some((queue) => queue.name === form.getFieldValue("queue_name"))) return;
    const preferred =
      available.find((queue) => queue.name === "default") ??
      (!queues.data.hasMore && available.length === 1 ? available[0] : undefined);
    form.setFieldsValue({ queue_name: preferred?.name });
  }, [form, queues.data, queues.isError, queues.isFetching]);
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
          rules={[
            {
              validator: (value: string | undefined, callback) =>
                callback(
                  value?.trim() && Array.from(value).length <= 64 && !/[\0\r\n]/.test(value)
                    ? undefined
                    : "请输入 1–64 个字符的单行资源池名称",
                ),
            },
          ]}
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
            {uniquePool ? (
              <ReadonlyOptionValue
                options={(pools.data?.items ?? []).map((pool) => ({
                  value: pool.pool_id,
                  label: pool.display_name,
                }))}
              />
            ) : (
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
            )}
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
          rules={[
            {
              validator: (value: string | undefined, callback) =>
                callback(
                  value?.trim() && Array.from(value).length <= 64 && !/[\0\r\n]/.test(value)
                    ? undefined
                    : "请输入 1–64 个字符的单行供给组名称",
                ),
            },
          ]}
        >
          <Input placeholder="请输入新供给组名称" />
        </Form.Item>
        <Form.Item
          field="provider_config_ref"
          label="已登记的 GPU 供给"
          rules={[{ required: true, message: "请选择共同支持的已登记供给" }]}
          extra={
            configs.length
              ? "来自所选节点共同支持的已登记供给，引用可用于核对实际登记记录。"
              : "所选节点没有共同支持的已登记供给，请返回上一步分开选择节点；不同供给组仍可加入同一资源池"
          }
        >
          {configs.length === 1 ? (
            <ReadonlyOptionValue
              options={configs.map((configuration) => ({
                value: configuration.provider_config_ref,
                label: supplyLabel(configuration),
                detail: configuration.provider_config_ref,
              }))}
            />
          ) : (
            <Select
              filterOption={false}
              disabled={!configs.length}
              placeholder={configs.length ? "请选择已登记的 GPU 供给" : "请返回上一步分开选择节点"}
              options={configs.map((config) => ({
                label: `${supplyLabel(config)} · 引用：${config.provider_config_ref}`,
                value: config.provider_config_ref,
              }))}
            />
          )}
        </Form.Item>
        <Form.Item
          field="queue_name"
          label="Volcano 调度队列"
          rules={[
            { required: true, message: "请选择已有调度队列" },
            {
              validator: (value: string | undefined, callback) =>
                callback(
                  !queues.isError &&
                    !queues.isFetching &&
                    queues.data?.items.some((queue) => queue.name === value && queue.available)
                    ? undefined
                    : "请选择当前集群已加载的可用队列",
                ),
            },
          ]}
          extra={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {queues.isSuccess && !queues.data.items.some((queue) => queue.available)
                  ? "当前没有可用的 Open 叶队列，请核对队列状态。"
                  : "选择当前集群已有的可用队列。"}
              </span>
              <Button
                type="text"
                size="mini"
                icon={<IconRefresh spin={queues.isFetching} />}
                disabled={queues.isFetching}
                onClick={() => queues.refetch()}
              >
                刷新队列
              </Button>
            </div>
          }
        >
          {uniqueQueue ? (
            <ReadonlyOptionValue
              options={availableQueues.map((queue) => ({
                value: queue.name,
                label: `${queue.name} · ${queue.state}`,
              }))}
            />
          ) : (
            <Select
              showSearch
              loading={queues.isFetching}
              disabled={
                queues.isPending ||
                queues.isError ||
                !queues.data?.items.some((queue) => queue.available)
              }
              placeholder="请选择已有 Volcano 队列"
              options={(queues.data?.items ?? []).map((queue) => ({
                label: `${queue.name} · ${queue.unavailableReason ?? queue.state}`,
                value: queue.name,
                disabled: !queue.available,
              }))}
              onVisibleChange={(visible) => {
                if (visible && !queues.isFetching) queues.refetch();
              }}
            />
          )}
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
      {queues.data?.hasMore ? (
        <Alert content="当前仅展示前 100 个队列。存在后续队列时不会自动认定唯一可用项，请核对所选队列。" />
      ) : null}
    </div>
  );
}
