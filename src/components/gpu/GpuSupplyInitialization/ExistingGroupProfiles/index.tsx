import { gpuScopeKey, type GpuOperationScope } from "@/api/accelerator/scope";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Form, Input, InputNumber, Select } from "@arco-design/web-react";
import {
  listDiscoveredNodes,
  listGpuPools,
  listGpuSupplyGroups,
  type CreateInitializationInput,
  type GpuCluster,
  type GpuSupplyGroup,
} from "@/api/accelerator";
import { withId } from "@/lib/id";
import { policyLabel } from "../policy";
interface ExistingGroupProfilesProps {
  scope: GpuOperationScope;
  cluster: GpuCluster;
  onSubmit: (input: CreateInitializationInput) => void;
  submitting: boolean;
}
export function ExistingGroupProfiles({
  scope,
  cluster,
  onSubmit,
  submitting,
}: ExistingGroupProfilesProps) {
  const [poolId, setPoolId] = useState("");
  const [group, setGroup] = useState<GpuSupplyGroup>();
  const [profileName, setProfileName] = useState("");
  const [resourceIndex, setResourceIndex] = useState<number>();
  const [memory, setMemory] = useState("0");
  const [cores, setCores] = useState(0);
  const [units, setUnits] = useState(0);
  const [maxDevices, setMaxDevices] = useState(1);
  const pools = useQuery({
    queryKey: ["accelerator", "pool-options", gpuScopeKey(scope)],
    queryFn: ({ signal }) =>
      listGpuPools({ cluster_id: cluster.cluster_id, page_size: 100 }, signal),
    meta: {
      errorNotification: {
        id: withId("gpu-pool-options", cluster.cluster_id),
        action: "资源池加载",
      },
    },
  });
  const groups = useQuery({
    queryKey: ["accelerator", "group-options", gpuScopeKey(scope), poolId],
    queryFn: ({ signal }) =>
      listGpuSupplyGroups(
        { cluster_id: cluster.cluster_id, pool_id: poolId, page_size: 100 },
        signal,
      ),
    enabled: Boolean(poolId),
    meta: {
      errorNotification: { id: withId("gpu-group-options", poolId), action: "已有供给组加载" },
    },
  });
  const discovery = useQuery({
    queryKey: [
      "accelerator",
      "discovered-nodes",
      cluster.connection_ref,
      "existing-group-revision",
    ],
    queryFn: ({ signal }) =>
      listDiscoveredNodes({ connection_ref: cluster.connection_ref, page: 1, pageSize: 1 }, signal),
    meta: {
      errorNotification: {
        id: withId("gpu-discovered-nodes", cluster.connection_ref),
        action: "初始化发现版本加载",
      },
    },
  });
  const resource =
    resourceIndex === undefined ? undefined : group?.baseline?.resource_types?.[resourceIndex];
  const valid =
    group &&
    profileName.trim() &&
    discovery.data?.discovery_revision &&
    (group.policy || (resource && /^\d+$/.test(memory)));
  const submit = () => {
    if (!valid || !group) return;
    const profile = group.policy
      ? { derive_from_group_policy: true as const }
      : {
          allocation_type: resource!.allocation_type,
          resource_key: resource!.resource_key,
          memory_mib_per_device: memory,
          core_limit_percent: cores,
          compute_units_per_device: units,
          max_devices_per_replica: maxDevices,
        };
    onSubmit({
      connection_ref: cluster.connection_ref,
      discovery_revision: discovery.data!.discovery_revision,
      pools: [{ client_key: "pool", existing_pool_id: poolId }],
      groups: [
        {
          client_key: "group",
          existing_group: { group_id: group.group_id, expected_version: group.version },
        },
      ],
      profiles: [
        { client_key: "profile", group_key: "group", display_name: profileName.trim(), ...profile },
      ],
    });
  };
  return (
    <div className="flex flex-col gap-4">
      <Alert
        type="info"
        content="已有策略组继续按冻结策略生成规格；历史组使用原显式规格语义。已有组保持其原接单状态，不自动开单。"
      />
      <Form layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="已有资源池（前 100 项）" required>
            <Select
              value={poolId || undefined}
              loading={pools.isFetching}
              options={(pools.data?.items ?? []).map((pool) => ({
                value: pool.pool_id,
                label: pool.display_name,
              }))}
              onChange={(id) => {
                setPoolId(id);
                setGroup(undefined);
              }}
            />
          </Form.Item>
          <Form.Item label="已有供给组（前 100 项）" required>
            <Select
              value={group?.group_id}
              loading={groups.isFetching}
              options={(groups.data?.items ?? []).map((item) => ({
                value: item.group_id,
                label: item.display_name,
              }))}
              onChange={(id) => {
                setGroup(groups.data?.items?.find((item) => item.group_id === id));
                setResourceIndex(undefined);
              }}
            />
          </Form.Item>
        </div>
        {group ? (
          <div className="mb-4 break-all">
            组 ID：{group.group_id} · 版本：{group.version}
            <br />
            接单状态：{group.admission} · 插件实际 K：{group.baseline?.split_count ?? "-"}
            <br />
            {group.policy
              ? `冻结策略：${policyLabel(group.policy)} · 登记 ${group.provider_config_ref} / v${group.provider_config_version}`
              : "历史组：显式规格，沿用原规则"}
          </div>
        ) : null}
        {group && !group.policy ? (
          <>
            <Form.Item label="原登记资源类型" required>
              <Select
                value={resourceIndex}
                options={(group.baseline?.resource_types ?? []).map((item, index) => ({
                  value: index,
                  label: `${item.allocation_type} · ${item.resource_key}`,
                }))}
                onChange={setResourceIndex}
              />
            </Form.Item>
            <div className="grid grid-cols-2 gap-x-4">
              <Form.Item label="每设备业务显存 MiB" required>
                <Input value={memory} onChange={setMemory} />
              </Form.Item>
              <Form.Item label="请求算力百分比">
                <InputNumber value={cores} min={0} max={100} precision={0} onChange={setCores} />
              </Form.Item>
              <Form.Item label="每设备计算单元 CU">
                <InputNumber value={units} min={0} precision={0} onChange={setUnits} />
              </Form.Item>
              <Form.Item label="每副本设备上限（历史入口 1..16）">
                <InputNumber
                  value={maxDevices}
                  min={1}
                  max={16}
                  precision={0}
                  onChange={setMaxDevices}
                />
              </Form.Item>
            </div>
          </>
        ) : null}
        <Form.Item label="规格名称" required>
          <Input value={profileName} onChange={setProfileName} maxLength={200} />
        </Form.Item>
      </Form>
      <div>
        <Button type="primary" disabled={!valid} loading={submitting} onClick={submit}>
          确认并提交已有组规格
        </Button>
      </div>
    </div>
  );
}
