import { useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Alert, Button, Checkbox, Form, Typography } from "@arco-design/web-react";
import { IconInfoCircle } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import {
  acceleratorKeys,
  createGpuInitialization,
  getGpuInitialization,
  type GpuAllocationType,
  type GpuCluster,
  type GpuDiscoveredNode,
  type GpuInitializationInput,
} from "@/api/accelerator";
import { ApiError } from "@/api/request";
import { WizardModal } from "@/components/common";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";
import { gpuInitializationIntents, setGpuInitializationIntent } from "@/stores/gpu-initialization";
import {
  commonGpuProviderConfigs,
  fixedPartitionMemoryMib,
  gpuInitializationIsRunning,
  gpuNodesHaveConflictingModels,
} from "../initialization";
import { GpuNodeSelection } from "./GpuNodeSelection";
import { GpuPoolOrganization } from "./GpuPoolOrganization";
import { GpuInitializationProfileFields } from "./GpuInitializationProfileFields";
import { GpuInitializationSummary } from "./GpuInitializationSummary";
import { GpuInitializationContext } from "../GpuInitializationContext";
import styles from "../initialization.module.less";
import { PrepareGpuSupplyModal } from "../PrepareGpuSupplyModal";

interface InitializeGpuPoolModalProps {
  cluster: GpuCluster;
  onCancel: () => void;
  onOperation: (operationId: string) => void;
}

interface GpuPoolInitializationFormValues {
  pool_mode: "new" | "existing";
  pool_name: string;
  existing_pool_id: string;
  group_name: string;
  provider_config_ref: string;
  queue_name: string;
  profile_name: string;
  allocation_type: GpuAllocationType;
  resource_key: string;
  memory_mib_per_device: string;
  fixed_memory_bytes: string;
  core_limit_percent: number;
  compute_units_per_device: number;
  max_devices_per_replica: number;
}

export function InitializeGpuPoolModal({
  cluster,
  onCancel,
  onOperation,
}: InitializeGpuPoolModalProps) {
  const [form] = Form.useForm<GpuPoolInitializationFormValues>();
  const frozen = useStore(
    gpuInitializationIntents,
    (state) => state.creates[cluster.connection_ref],
  );
  const [step, setStep] = useState(frozen ? 4 : 1);
  const [nodes, setNodes] = useState<GpuDiscoveredNode[]>([]);
  const [preparation, setPreparation] = useState<{
    nodes: GpuDiscoveredNode[];
    revision: string;
  }>();
  const [revision, setRevision] = useState("");
  const revisionRef = useRef("");
  const [poolMode, setPoolMode] = useState<"new" | "existing">("new");
  const [configRef, setConfigRef] = useState("");
  const [allocationType, setAllocationType] = useState<GpuAllocationType>();
  const [summary, setSummary] = useState<GpuInitializationInput>();
  const [confirmed, setConfirmed] = useState(false);
  const [existingPoolName, setExistingPoolName] = useState<string>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [validating, setValidating] = useState(false);
  const lock = useRef(false);
  const client = useQueryClient();
  const configs = commonGpuProviderConfigs(nodes);
  const config = configs.find((item) => item.provider_config_ref === configRef);
  const conflictingModels = gpuNodesHaveConflictingModels(nodes);
  const status = useQuery({
    queryKey: [...acceleratorKeys.all, "initialization", cluster.connection_ref],
    queryFn: ({ signal }) => getGpuInitialization(cluster.connection_ref, signal),
    refetchOnMount: "always",
    meta: {
      errorNotification: {
        id: withId("gpu-initialization", cluster.connection_ref),
        action: "GPU 初始化状态加载",
      },
    },
  });
  const latest = status.data?.latest_operation;
  const unfinished = gpuInitializationIsRunning(latest?.state) || latest?.state === "BLOCKED";
  const mutation = useMutation({
    mutationFn: createGpuInitialization,
    retry: false,
    meta: {
      feedback: {
        channel: "message",
        action: "GPU 资源池初始化",
        successText: "初始化已提交",
      },
    },
    onSuccess: async (operation) => {
      client.setQueryData(
        [...acceleratorKeys.all, "initialization-operation", operation.operation_id],
        operation,
      );
      await client.invalidateQueries({ queryKey: acceleratorKeys.all });
      onOperation(operation.operation_id!);
      setGpuInitializationIntent(cluster.connection_ref);
    },
    onError: async (error) => {
      // 传输失败、超时和服务端故障都可能已经产生副作用，只能重发冻结的原请求。
      if (error instanceof ApiError && error.status && error.status < 500 && error.status !== 408) {
        setGpuInitializationIntent(cluster.connection_ref);
        if (error.status === 409 || error.status === 412) {
          revisionRef.current = "";
          setRevision("");
          setNodes([]);
          setStep(1);
          setSummary(undefined);
          await client.invalidateQueries({ queryKey: acceleratorKeys.all });
        }
      }
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  const busy = validating || mutation.isPending;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);
  const resetConfig = useCallback(() => {
    setConfigRef("");
    setAllocationType(undefined);
    setSummary(undefined);
    setConfirmed(false);
    form.resetFields([
      "provider_config_ref",
      "allocation_type",
      "resource_key",
      "memory_mib_per_device",
      "fixed_memory_bytes",
      "core_limit_percent",
      "compute_units_per_device",
      "max_devices_per_replica",
    ]);
  }, [form]);
  const onSnapshot = useCallback(
    (next: string) => {
      if (revisionRef.current === next) return;
      revisionRef.current = next;
      setRevision(next);
      setNodes([]);
      resetConfig();
      setStep(1);
    },
    [resetConfig],
  );
  const advance = async () => {
    if (lock.current || busy) return;
    lock.current = true;
    setValidating(true);
    let submitted = false;
    try {
      if (step === 1) {
        if (!nodes.length || !revision || !status.data || unfinished || conflictingModels) return;
        setStep(2);
      } else if (step === 2) {
        await validateForm({
          validate: () =>
            form.validate([
              poolMode === "new" ? "pool_name" : "existing_pool_id",
              "group_name",
              "provider_config_ref",
              "queue_name",
            ]),
        });
        setStep(3);
      } else if (step === 3) {
        const values = await validateForm<GpuPoolInitializationFormValues>(form);
        const input: GpuInitializationInput = {
          connection_ref: cluster.connection_ref,
          discovery_revision: revision,
          pools: [
            values.pool_mode === "new"
              ? {
                  client_key: "pool_a",
                  new_pool: { display_name: values.pool_name.trim() },
                }
              : {
                  client_key: "pool_a",
                  existing_pool_id: values.existing_pool_id,
                },
          ],
          groups: [
            {
              client_key: "group_a",
              new_group: {
                pool_key: "pool_a",
                display_name: values.group_name.trim(),
                nodes: nodes.map((item) => ({
                  uid: item.node!.uid,
                  name: item.node!.name,
                })),
                provider_config_ref: values.provider_config_ref,
                queue_name: values.queue_name,
              },
            },
          ],
          profiles: [
            {
              client_key: "profile_a",
              group_key: "group_a",
              display_name: values.profile_name.trim(),
              allocation_type: values.allocation_type,
              resource_key: values.resource_key.trim(),
              memory_mib_per_device: values.memory_mib_per_device,
              core_limit_percent: values.core_limit_percent,
              compute_units_per_device: values.compute_units_per_device,
              max_devices_per_replica: values.max_devices_per_replica,
            },
          ],
        };
        setSummary(input);
        setConfirmed(false);
        setStep(4);
      } else if (confirmed && (frozen || summary)) {
        const input = frozen ?? summary!;
        setGpuInitializationIntent(cluster.connection_ref, input);
        submitted = true;
        mutation.mutate(input);
      }
    } catch {
      // 字段错误与校验失败反馈由 validateForm 统一展示。
    } finally {
      setValidating(false);
      if (!submitted) lock.current = false;
    }
  };
  return (
    <>
      <WizardModal
        title="初始化 GPU 资源池"
        description="将节点纳入资源池，创建可供业务引用的 GPU 规格。"
        className={clsx(styles.modal, styles.wizard)}
        width={1040}
        current={step}
        steps={["选择节点", "组织资源", "配置规格", "确认提交"]}
        scrollRef={scrollRef}
        onStepChange={(next) => {
          if (!busy && !frozen && next < step) {
            setConfirmed(false);
            setStep(next);
          }
        }}
        context={
          // GPU 初始化从集群行进入，直接沿用该集群，不在分步流程中再次提供集群选择。
          <GpuInitializationContext
            cluster={cluster}
            connected={status.data?.checks?.some(
              (check) => check.key === "connection" && check.state === "PASS",
            )}
          />
        }
        busy={busy}
        onCancel={() => {
          if (!busy) onCancel();
        }}
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-(--color-text-3)">
              <IconInfoCircle />
              {step === 4 ? "提交后可查看任务进度" : "提交前不会修改集群资源"}
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button disabled={busy} onClick={onCancel}>
                {frozen ? "关闭" : "取消"}
              </Button>
              {step > 1 && !frozen ? (
                <Button
                  disabled={busy}
                  onClick={() => {
                    setConfirmed(false);
                    setStep(step - 1);
                  }}
                >
                  上一步
                </Button>
              ) : null}
              <Button
                type="primary"
                loading={busy}
                disabled={
                  (step === 1 &&
                    (!nodes.length ||
                      !revision ||
                      !status.data ||
                      status.isFetching ||
                      unfinished ||
                      conflictingModels)) ||
                  (step === 2 && !config) ||
                  (step === 3 && !allocationType) ||
                  (step === 4 && !confirmed)
                }
                onClick={advance}
              >
                <span className="inline-flex items-center gap-2">
                  {step === 4 ? (frozen ? "重发原初始化请求" : "提交初始化") : "下一步"}
                </span>
              </Button>
            </div>
          </div>
        }
      >
        <div className="pt-6">
          {latest?.operation_id ? (
            <div className="my-4 flex flex-wrap items-center gap-3">
              <Typography.Text>
                {unfinished ? "该集群有未结束的初始化任务，请先查看处理。" : "该集群有初始化记录。"}
              </Typography.Text>
              <Button type="text" disabled={busy} onClick={() => onOperation(latest.operation_id!)}>
                查看已有任务
              </Button>
            </div>
          ) : null}
          {frozen ? (
            <Alert
              className="my-4"
              type="warning"
              content="上次初始化提交的结果尚未确认。当前保留原始内容，重发会复用原幂等键；请勿重新创建相同资源。"
            />
          ) : null}
          {!frozen ? (
            <Form
              form={form}
              layout="vertical"
              disabled={busy}
              initialValues={{
                pool_mode: "new",
                core_limit_percent: 0,
                compute_units_per_device: 0,
                max_devices_per_replica: 1,
              }}
              onChange={(changed, values) => {
                setConfirmed(false);
                if ("pool_mode" in changed) setPoolMode(values.pool_mode ?? "new");
                if ("provider_config_ref" in changed || "allocation_type" in changed) {
                  const nextConfig = configs.find(
                    (item) => item.provider_config_ref === values.provider_config_ref,
                  );
                  const nvidia = nextConfig?.adapter_id === "volcano-hami-mib-v1";
                  const allowed = (nextConfig?.allocation_types ?? []).filter((type) =>
                    nextConfig?.adapter_id === "hygon-hcu-v1"
                      ? type === "PHYSICAL" || type === "FIXED_PARTITION"
                      : nvidia && (type === "PHYSICAL" || type === "DYNAMIC_SHARED"),
                  );
                  const nextType =
                    "provider_config_ref" in changed ? allowed[0] : values.allocation_type;
                  setConfigRef(values.provider_config_ref ?? "");
                  setAllocationType(nextType);
                  form.setFieldsValue({
                    allocation_type: nextType,
                    resource_key: nvidia ? "volcano.sh/vgpu-number" : "",
                    memory_mib_per_device: !nvidia && nextType === "PHYSICAL" ? "0" : "",
                    fixed_memory_bytes: "",
                    core_limit_percent: nvidia && nextType === "PHYSICAL" ? 100 : nvidia ? 1 : 0,
                    compute_units_per_device: 0,
                    max_devices_per_replica: 1,
                  });
                }
                if ("fixed_memory_bytes" in changed)
                  form.setFieldValue(
                    "memory_mib_per_device",
                    fixedPartitionMemoryMib(values.fixed_memory_bytes ?? "") ?? "",
                  );
              }}
            >
              <div hidden={step !== 1}>
                <div className="flex flex-col gap-5">
                  <GpuNodeSelection
                    onPrepareSupply={(snapshotNodes, snapshotRevision) =>
                      setPreparation({ nodes: snapshotNodes, revision: snapshotRevision })
                    }
                    prepareDisabled={busy || unfinished || status.isFetching}
                    checks={status.data?.checks ?? []}
                    connectionRef={cluster.connection_ref}
                    value={nodes}
                    revision={revision}
                    onSnapshot={onSnapshot}
                    onChange={(next) => {
                      setNodes(next);
                      resetConfig();
                    }}
                  />
                  {conflictingModels ? (
                    <Alert
                      type="warning"
                      content="所选节点的已观测设备型号没有交集，请调整节点，确保同一供给组使用共同支持的型号。"
                    />
                  ) : null}
                </div>
              </div>
              <div hidden={step !== 2}>
                <GpuPoolOrganization
                  clusterId={cluster.cluster_id}
                  poolMode={poolMode}
                  configs={configs}
                  nodes={nodes}
                  onExistingPoolChange={setExistingPoolName}
                />
              </div>
              <div hidden={step !== 3}>
                <GpuInitializationProfileFields config={config} allocationType={allocationType} />
              </div>
            </Form>
          ) : null}
          {step === 4 && (frozen || summary) ? (
            <div className="flex flex-col gap-4">
              <GpuInitializationSummary
                cluster={cluster}
                input={(frozen ?? summary)!}
                poolName={!frozen ? existingPoolName : undefined}
                config={!frozen ? config : undefined}
                nodes={!frozen ? nodes : undefined}
                onEdit={
                  !frozen && !busy
                    ? (next) => {
                        setConfirmed(false);
                        setStep(next);
                      }
                    : undefined
                }
              />
              <Checkbox checked={confirmed} disabled={busy} onChange={setConfirmed}>
                我已核对所选节点、调度队列与真实供给参数
              </Checkbox>
            </div>
          ) : null}
        </div>
      </WizardModal>
      {preparation ? (
        <PrepareGpuSupplyModal
          cluster={cluster}
          nodes={preparation.nodes}
          discoveryRevision={preparation.revision}
          onCancel={() => {
            // 原初始化弹窗保持挂载。关闭准备窗口后，重新读取两个 GET，不以本地生成放行。
            onSnapshot("");
            client.invalidateQueries({
              queryKey: [...acceleratorKeys.all, "initialization", cluster.connection_ref],
            });
            client.invalidateQueries({
              predicate: (query) =>
                query.queryKey[0] === acceleratorKeys.all[0] &&
                query.queryKey[1] === "discovered-nodes" &&
                (query.queryKey[2] as { connection_ref?: string } | undefined)?.connection_ref ===
                  cluster.connection_ref,
            });
            setPreparation(undefined);
          }}
        />
      ) : null}
    </>
  );
}
