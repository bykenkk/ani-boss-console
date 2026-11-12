import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input, Radio, Select } from "@arco-design/web-react";
import { DataTable, type ListColumn } from "@/components/common";
import {
  getSupplyConfiguration,
  listDiscoveredNodes,
  listGpuPools,
  previewSupplyGroupPolicy,
  type CreateInitializationInput,
  type DiscoveredSupplyNode,
  type DiscoveredNodes,
  type GpuCluster,
  type GpuNode,
} from "@/api/accelerator";
import { withId } from "@/lib/id";
import { listGpuVolcanoQueueOptions } from "@/api/accelerator/volcano-queues";
import { chooseInitializationQueue } from "./queues";
import { PolicyShape } from "../PolicyShape";
import { policyLabel } from "../policy";
import { supplyReasonText } from "../reasons";
interface GroupPolicySetupProps {
  cluster: GpuCluster;
  providerRef: string;
  onProviderChange: (value: string) => void;
  onSubmit: (input: CreateInitializationInput) => void;
  submitting: boolean;
}
const emptyNodes: GpuNode[] = [];
const columns: ListColumn<DiscoveredSupplyNode>[] = [
  { title: "节点", dataIndex: "node.name", width: 200 },
  { title: "Node UID", dataIndex: "node.uid", width: 280, ellipsis: true },
  { title: "已属供给组", dataIndex: "group_id", width: 220, ellipsis: true },
  {
    title: "受管供给",
    width: 300,
    render: (_, row) =>
      row.provider_configs?.map((config) => (
        <div key={config.provider_config_ref}>
          {config.provider_config_ref} · v{config.provider_config_version} · {config.source_kind}
        </div>
      )),
  },
  {
    title: "不可选原因",
    width: 320,
    render: (_, row) =>
      row.blocking_reasons?.map((reason) => <div key={reason}>{supplyReasonText(reason)}</div>),
  },
];
export function GroupPolicySetup({
  cluster,
  providerRef,
  onProviderChange,
  onSubmit,
  submitting,
}: GroupPolicySetupProps) {
  const [page, setPage] = useState(1);
  const [selection, setSelection] = useState<{ context: string; nodes: GpuNode[] }>({
    context: "",
    nodes: [],
  });
  const [choice, setChoice] = useState<{ context: string; index: number }>();
  const [poolKind, setPoolKind] = useState("new");
  const [poolName, setPoolName] = useState("");
  const [poolId, setPoolId] = useState("");
  const [groupName, setGroupName] = useState("");
  const [queueName, setQueueName] = useState("");
  const [profileName, setProfileName] = useState("");
  const discovery = useQuery<DiscoveredNodes>({
    queryKey: ["accelerator", "discovered-nodes", cluster.connection_ref, page],
    placeholderData: (previous) => previous,
    queryFn: ({ signal }) =>
      listDiscoveredNodes({ connection_ref: cluster.connection_ref, page, pageSize: 100 }, signal),
    meta: {
      errorNotification: {
        id: withId("gpu-discovered-nodes", cluster.connection_ref),
        action: "GPU 节点加载",
      },
    },
  });
  const configuration = useQuery({
    queryKey: ["accelerator", "supply-configuration", cluster.connection_ref, providerRef],
    queryFn: ({ signal }) => getSupplyConfiguration(cluster.connection_ref, providerRef, signal),
    enabled: Boolean(providerRef),
    meta: {
      errorNotification: {
        id: withId("gpu-supply-configuration", providerRef),
        action: "供给登记读取",
      },
    },
  });
  const pools = useQuery({
    queryKey: ["accelerator", "pool-options", cluster.cluster_id],
    queryFn: ({ signal }) =>
      listGpuPools({ cluster_id: cluster.cluster_id, page_size: 100 }, signal),
    enabled: poolKind === "existing",
    meta: {
      errorNotification: {
        id: withId("gpu-pool-options", cluster.cluster_id),
        action: "资源池加载",
      },
    },
  });
  const queues = useQuery({
    queryKey: ["accelerator", "volcano-queue-options", cluster.cluster_id],
    queryFn: ({ signal }) => listGpuVolcanoQueueOptions(cluster.cluster_id, signal),
    enabled: Boolean(cluster.cluster_id),
    meta: {
      errorNotification: {
        id: withId("gpu-volcano-queue-options", cluster.cluster_id),
        action: "Volcano 调度队列加载",
      },
    },
  });
  if (queues.data && !queues.isError && !queues.isFetching) {
    const nextQueue = chooseInitializationQueue(queueName, queues.data);
    if (nextQueue !== queueName) setQueueName(nextQueue);
  }
  const queueAvailable =
    !queues.isError &&
    !queues.isFetching &&
    queues.data?.items.some((queue) => queue.name === queueName && queue.available);
  const nodeContext = `${providerRef}:${configuration.data?.version ?? ""}:${discovery.data?.discovery_revision ?? ""}`;
  // Forget the old selection on every structural context transition, even if a
  // later refresh returns the previous revision again. Paging retains its data.
  if (selection.context !== nodeContext) {
    setSelection({ context: nodeContext, nodes: [] });
    if (choice) setChoice(undefined);
  }
  const nodes = selection.context === nodeContext ? selection.nodes : emptyNodes;
  const previewInput = useMemo(
    () => ({
      connection_ref: cluster.connection_ref,
      provider_config_ref: providerRef,
      provider_config_version: configuration.data?.version ?? "",
      nodes,
      discovery_revision: discovery.data?.discovery_revision ?? "",
    }),
    [
      cluster.connection_ref,
      providerRef,
      configuration.data?.version,
      nodes,
      discovery.data?.discovery_revision,
    ],
  );
  const previewContext = JSON.stringify(previewInput);
  const preview = useQuery({
    queryKey: ["accelerator", "group-policy-preview", previewInput],
    queryFn: ({ signal }) => previewSupplyGroupPolicy(previewInput, signal),
    enabled: Boolean(
      providerRef &&
      configuration.data?.version &&
      nodes.length &&
      discovery.data?.discovery_revision,
    ),
    staleTime: 60_000,
    meta: {
      errorNotification: {
        id: withId("gpu-group-policy-preview", cluster.connection_ref),
        action: "组策略预览",
      },
    },
  });
  const selectedOption =
    choice?.context === previewContext ? preview.data?.options?.[choice.index] : undefined;
  const references = [
    ...new Set([
      ...(providerRef ? [providerRef] : []),
      ...(discovery.data?.items ?? []).flatMap(
        (node) => node.provider_configs?.map((config) => config.provider_config_ref) ?? [],
      ),
    ]),
  ];
  const valid =
    selectedOption?.selectable &&
    selectedOption.shape &&
    nodes.length > 0 &&
    groupName.trim() &&
    queueAvailable &&
    profileName.trim() &&
    (poolKind === "new" ? poolName.trim() : poolId);
  const submit = () => {
    if (!valid || !selectedOption) return;
    onSubmit({
      connection_ref: cluster.connection_ref,
      discovery_revision: previewInput.discovery_revision,
      pools: [
        {
          client_key: "pool",
          ...(poolKind === "new"
            ? { new_pool: { display_name: poolName.trim() } }
            : { existing_pool_id: poolId }),
        },
      ],
      groups: [
        {
          client_key: "group",
          new_group: {
            pool_key: "pool",
            display_name: groupName.trim(),
            nodes,
            queue_name: queueName.trim(),
            provider_config_ref: providerRef,
            provider_config_version: previewInput.provider_config_version,
            policy: selectedOption.policy,
          },
        },
      ],
      profiles: [
        {
          client_key: "profile",
          group_key: "group",
          display_name: profileName.trim(),
          derive_from_group_policy: true,
        },
      ],
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        content="选择已登记供给和完整节点集合。每个节点只属于一个组，组创建后策略固定。登记后的节点发现版本与供给候选版本分别使用。"
      />
      <Form layout="vertical">
        <Form.Item label="受管供给引用" required>
          <Select
            value={providerRef || undefined}
            options={references}
            onChange={(value) => {
              setSelection({ context: "", nodes: [] });
              setChoice(undefined);
              onProviderChange(value);
            }}
            placeholder="从发现节点的 provider_config_ref 选择"
          />
        </Form.Item>
      </Form>
      {configuration.data ? (
        <div className="break-all">
          登记 ID：{configuration.data.registration_id} · 供给：
          {configuration.data.provider_config_ref} · 版本：{configuration.data.version}
          <br />
          {configuration.data.capability?.whole_max_devices_per_replica === undefined
            ? null
            : `批准的整卡单副本上限：${configuration.data.capability.whole_max_devices_per_replica}`}
          {configuration.data.capability?.whole_max_devices_per_replica === 1 &&
          !configuration.data.candidates?.some((candidate) => candidate.source_kind)
            ? "（旧登记可批准单卡）"
            : ""}
        </div>
      ) : null}
      <DataTable
        header={{
          title: "① 选择节点",
          extra: (
            <Button
              loading={discovery.isFetching}
              onClick={() => {
                setChoice(undefined);
                discovery.refetch();
              }}
            >
              刷新节点
            </Button>
          ),
        }}
        rowKey={(row) => row.node.uid}
        data={discovery.data?.items ?? []}
        columns={columns}
        loading={discovery.isFetching}
        tableLabel="GPU 初始化节点"
        pagination={{
          page,
          pageSize: 100,
          total: Number(discovery.data?.total ?? 0),
          onPageChange: setPage,
          onPageSizeChange: () => {},
          pageSizeOptions: [100],
        }}
        rowSelection={{
          checkCrossPage: true,
          preserveSelectedRowKeys: true,
          selectedRowKeys: nodes.map((node) => node.uid),
          checkboxProps: (row) => ({
            disabled:
              !row.selectable ||
              !providerRef ||
              !row.provider_configs?.some((config) => config.provider_config_ref === providerRef),
          }),
          onChange: (keys) => {
            setChoice(undefined);
            const known = new Map(
              [...nodes, ...(discovery.data?.items ?? []).map((row) => row.node)].map((node) => [
                node.uid,
                node,
              ]),
            );
            setSelection({
              context: nodeContext,
              nodes: keys
                .map((key) => known.get(String(key)))
                .filter((node): node is GpuNode => Boolean(node))
                .sort((a, b) => a.uid.localeCompare(b.uid)),
            });
          },
        }}
      />
      <div>
        已选 {nodes.length} 个节点 · 初始化 revision：
        <span className="break-all">{discovery.data?.discovery_revision ?? "-"}</span>
      </div>
      <Form layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="② 组织资源">
            <Radio.Group type="button" value={poolKind} onChange={setPoolKind}>
              <Radio value="new">新建资源池</Radio>
              <Radio value="existing">已有资源池</Radio>
            </Radio.Group>
          </Form.Item>
          <div />
          {poolKind === "new" ? (
            <Form.Item label="资源池名称" required>
              <Input value={poolName} onChange={setPoolName} maxLength={200} />
            </Form.Item>
          ) : (
            <Form.Item label="已有资源池（最多显示前 100 项）" required>
              <Select
                value={poolId || undefined}
                onChange={setPoolId}
                loading={pools.isFetching}
                options={(pools.data?.items ?? []).map((pool) => ({
                  value: pool.pool_id,
                  label: pool.display_name,
                }))}
              />
            </Form.Item>
          )}
          <Form.Item label="新供给组名称" required>
            <Input value={groupName} onChange={setGroupName} maxLength={200} />
          </Form.Item>
          <Form.Item
            label="Volcano 调度队列"
            required
            extra={
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>
                  {queues.isError
                    ? "队列未加载成功，请刷新后选择。"
                    : queues.isSuccess && !queues.data.items.some((queue) => queue.available)
                      ? "当前没有可用的 Open 叶队列，请核对队列状态。"
                      : "选择当前集群已有的可用 Open 叶队列。"}
                </span>
                <Button
                  type="text"
                  size="mini"
                  loading={queues.isFetching}
                  disabled={submitting || queues.isFetching}
                  onClick={() => queues.refetch()}
                >
                  刷新队列
                </Button>
              </div>
            }
          >
            <Select
              aria-label="Volcano 调度队列"
              showSearch
              value={queueName || undefined}
              onChange={setQueueName}
              loading={queues.isFetching}
              disabled={
                submitting ||
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
            {queues.data?.hasMore ? (
              <div className="mt-1 text-xs text-(--color-text-3)">
                当前仅展示前 100 个队列，不会将当前页唯一选项视为全部可用队列。
              </div>
            ) : null}
          </Form.Item>
        </div>
      </Form>
      <DataTable
        header={{
          title: "组策略选项",
          description: "同一次预览返回全部选项，切换已返回的选项不重新请求。",
        }}
        rowKey="option_key"
        data={(preview.data?.options ?? []).map((option, index) => ({
          ...option,
          option_key: String(index),
        }))}
        pagination={false}
        loading={preview.isFetching}
        tableLabel="组策略选项"
        columns={[
          { title: "策略", width: 200, render: (_, option) => policyLabel(option.policy) },
          {
            title: "可选",
            width: 120,
            render: (_, option) => (
              <Radio
                checked={
                  choice?.context === previewContext && choice.index === Number(option.option_key)
                }
                disabled={!option.selectable || !option.shape}
                onChange={() =>
                  setChoice({ context: previewContext, index: Number(option.option_key) })
                }
              >
                {option.selectable ? "选择" : "不可选"}
              </Radio>
            ),
          },
          {
            title: "原因及缺项",
            width: 420,
            render: (_, option) => (
              <div>
                {option.blocking_reasons?.map((reason) => (
                  <div key={reason}>{supplyReasonText(reason)}</div>
                ))}
                {option.missing_fields?.length ? `缺少：${option.missing_fields.join("、")}` : null}
              </div>
            ),
          },
        ]}
      />
      {selectedOption?.shape ? (
        <>
          <h3 className="font-medium">③ 配置规格</h3>
          <PolicyShape shape={selectedOption.shape} policy={selectedOption.policy} />
          <Form layout="vertical">
            <Form.Item label="规格名称" required>
              <Input value={profileName} onChange={setProfileName} maxLength={200} />
            </Form.Item>
          </Form>
          <Alert
            type="info"
            content="ACC 根据冻结策略生成规格。显存、算力和设备上限均为只读，不接受手动覆盖。"
          />
        </>
      ) : null}
      <div>
        <Button
          type="primary"
          disabled={!valid || preview.isFetching || nodes.length > 1024}
          loading={submitting}
          onClick={submit}
        >
          ④ 确认并提交初始化
        </Button>
      </div>
    </div>
  );
}
