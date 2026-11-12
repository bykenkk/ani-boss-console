import { requireGpuOperationTarget, requireGpuSupplyTarget } from "@/api/accelerator/scope";
import { useGpuOperationScope, useGpuPermissions } from "@/hooks/useGpuTarget";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Alert, Button, Checkbox, Form, Typography } from "@arco-design/web-react";
import { IconInfoCircle } from "@arco-design/web-react/icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import {
  acceleratorKeys,
  createGpuInitialization,
  getGpuInitialization,
  getGpuSupplyRegistration,
  type GpuAllocationType,
  type GpuCluster,
  type GpuDiscoveredNode,
  type GpuInitializationInput,
  type GpuInitialization,
  type GpuRegisteredSupplyConfiguration,
  type GpuSupplyRegistrationResult,
  type GpuProviderConfig,
} from "@/api/accelerator";
import { ApiError } from "@/api/request";
import { WizardModal } from "@/components/common";
import { validateForm } from "@/lib/form";
import { withId } from "@/lib/id";
import { gpuInitializationIntents, setGpuInitializationIntent } from "@/stores/gpu-initialization";
import {
  gpuSupplyRegistrationIntents,
  rememberGpuSupplyRegistration,
} from "@/stores/gpu-supply-registration";
import {
  commonGpuProviderConfigs,
  gpuInitializationIsRunning,
  gpuNodesHaveConflictingModels,
} from "../initialization";
import { GpuNodeSelection } from "./GpuNodeSelection";
import { GpuPoolOrganization } from "./GpuPoolOrganization";
import { GpuInitializationProfileFields } from "./GpuInitializationProfileFields";
import { GpuInitializationSummary } from "./GpuInitializationSummary";
import { GpuInitializationContext } from "../GpuInitializationContext";
import { useGpuInitializationSupply } from "./useGpuInitializationSupply";
import { previewNvidiaFixedProfile } from "./nvidia-fixed-profile";
import { formatGpuInitializationError, formatGpuInitializationReason } from "./presentation";
import styles from "../initialization.module.less";
import {
  PrepareGpuSupplyModal,
  type GpuSupplyRegistrationFeedback,
} from "../PrepareGpuSupplyModal";

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
  core_limit_percent: number;
  max_devices_per_replica: number;
  nvidia_parts?: number;
}

export function InitializeGpuPoolModal({
  cluster,
  onCancel,
  onOperation,
}: InitializeGpuPoolModalProps) {
  const { scope, scopeKey } = useGpuOperationScope(cluster);
  const { can } = useGpuPermissions();
  const [form] = Form.useForm<GpuPoolInitializationFormValues>();
  const frozen = useStore(gpuInitializationIntents, (state) => state.creates[scopeKey]);
  const pendingSupply = useStore(gpuSupplyRegistrationIntents, (state) => state.inputs[scopeKey]);
  const [step, setStep] = useState(frozen ? 4 : 1);
  const [nodes, setNodes] = useState<GpuDiscoveredNode[]>([]);
  const [preparation, setPreparation] = useState(false);
  const [supplyFeedback, setSupplyFeedback] = useState<GpuSupplyRegistrationFeedback>();
  const [supplyVerified, setSupplyVerified] = useState(false);
  const [supplyRefreshed, setSupplyRefreshed] = useState(false);
  const [registeredConfigurations, setRegisteredConfigurations] = useState<
    Record<string, GpuRegisteredSupplyConfiguration>
  >({});
  const [revision, setRevision] = useState("");
  const revisionRef = useRef("");
  const [poolMode, setPoolMode] = useState<"new" | "existing">("new");
  const [configRef, setConfigRef] = useState("");
  const [allocationType, setAllocationType] = useState<GpuAllocationType>();
  const [resourceKey, setResourceKey] = useState("");
  const [nvidiaParts, setNvidiaParts] = useState<number>();
  const [summary, setSummary] = useState<GpuInitializationInput>();
  const [confirmed, setConfirmed] = useState(false);
  const [existingPoolName, setExistingPoolName] = useState<string>();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [validating, setValidating] = useState(false);
  const lock = useRef(false);
  const client = useQueryClient();
  const configs = useMemo(() => commonGpuProviderConfigs(nodes), [nodes]);
  const config = configs.find((item) => item.provider_config_ref === configRef);
  const registeredConfiguration = registeredConfigurations[configRef];
  const {
    facts,
    refresh: refreshSupplyFacts,
    loadMore: loadMoreSupplyFacts,
  } = useGpuInitializationSupply({
    scope,
    connectionRef: cluster.connection_ref,
    nodes,
    config,
    allocationType,
    selectedResourceKey: resourceKey,
    discoveryRevision: revision,
    registration: registeredConfiguration,
    enabled: !frozen,
  });
  const nvidiaShared =
    facts.identity.adapterId === "volcano-hami-mib-v1" &&
    facts.identity.allocationType === "DYNAMIC_SHARED";
  const nvidiaPreview = useMemo(
    () => previewNvidiaFixedProfile(facts, nvidiaParts),
    [facts, nvidiaParts],
  );
  useEffect(() => {
    if (frozen) return;
    const automatic: Partial<GpuPoolInitializationFormValues> = {
      resource_key: facts.resourceKey ?? "",
    };
    if (facts.protocol.memoryMiBPerDevice !== undefined)
      automatic.memory_mib_per_device = facts.protocol.memoryMiBPerDevice;
    if (facts.protocol.coreLimitPercent !== undefined)
      automatic.core_limit_percent = facts.protocol.coreLimitPercent;
    const changed = Object.fromEntries(
      Object.entries(automatic).filter(
        ([key, value]) =>
          form.getFieldValue(key as keyof GpuPoolInitializationFormValues) !== value,
      ),
    );
    if (Object.keys(changed).length) form.setFieldsValue(changed);
  }, [facts, form, frozen]);
  const rememberRegistration = useCallback(
    (registration: GpuSupplyRegistrationResult) => {
      rememberGpuSupplyRegistration(registration, scope);
      setRegisteredConfigurations((current) => ({
        ...current,
        ...Object.fromEntries(
          registration.configurations
            .filter((item) => item.connection_ref === cluster.connection_ref)
            .map((item) => [item.provider_config_ref, item]),
        ),
      }));
    },
    [cluster.connection_ref, scope],
  );
  const conflictingModels = gpuNodesHaveConflictingModels(nodes);
  const status = useQuery({
    queryKey: [...acceleratorKeys.all, "initialization", scopeKey],
    queryFn: async ({ signal }) =>
      requireGpuOperationTarget(
        requireGpuSupplyTarget(
          (await getGpuInitialization(cluster.connection_ref, signal)) as GpuInitialization & {
            connection_ref: string;
          },
          scope,
        ),
        scope,
      ),
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
    mutationFn: (input: GpuInitializationInput) => createGpuInitialization(input, scope),
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
      setGpuInitializationIntent(scope);
    },
    onError: async (error) => {
      // 传输失败、超时和服务端故障都可能已经产生副作用，只能重发冻结的原请求。
      if (error instanceof ApiError && error.status && error.status < 500 && error.status !== 408) {
        setGpuInitializationIntent(scope);
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
  const busy =
    !scope.principal ||
    !can("accelerator:initialization:create") ||
    validating ||
    mutation.isPending;
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [step]);
  const resetConfig = useCallback(() => {
    setConfigRef("");
    setAllocationType(undefined);
    setResourceKey("");
    setNvidiaParts(undefined);
    setSummary(undefined);
    setConfirmed(false);
    form.resetFields([
      "provider_config_ref",
      "allocation_type",
      "resource_key",
      "memory_mib_per_device",
      "core_limit_percent",
      "max_devices_per_replica",
      "nvidia_parts",
    ]);
  }, [form]);
  const chooseConfiguration = (
    nextConfig?: GpuProviderConfig,
    requestedType?: GpuAllocationType,
  ) => {
    const nvidia = nextConfig?.adapter_id === "volcano-hami-mib-v1";
    const allowed = (nextConfig?.allocation_types ?? []).filter((type) =>
      nextConfig?.adapter_id === "hygon-hcu-v1"
        ? type === "PHYSICAL" || type === "FIXED_PARTITION"
        : nvidia && (type === "PHYSICAL" || type === "DYNAMIC_SHARED"),
    );
    const nextType =
      requestedType && allowed.includes(requestedType)
        ? requestedType
        : allowed.length === 1
          ? allowed[0]
          : undefined;
    const nextRef = nextConfig?.provider_config_ref ?? "";
    setConfigRef(nextRef);
    setAllocationType(nextType);
    setResourceKey("");
    setNvidiaParts(undefined);
    form.setFieldsValue({
      provider_config_ref: nextRef,
      allocation_type: nextType,
      resource_key: "",
      memory_mib_per_device: "",
      core_limit_percent: nextType === "DYNAMIC_SHARED" ? 1 : 0,
      max_devices_per_replica: 1,
      nvidia_parts: undefined,
    });
  };
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
        if (
          !nodes.length ||
          !configs.length ||
          !revision ||
          !status.data ||
          status.isError ||
          pendingSupply ||
          unfinished ||
          conflictingModels
        )
          return;
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
        if (!facts.ready || (nvidiaShared && !nvidiaPreview.profile)) return;
        const values = await validateForm<GpuPoolInitializationFormValues>(form);
        const resolvedAllocation = facts.identity.allocationType!;
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
              allocation_type: resolvedAllocation,
              resource_key: facts.protocol.resourceKey!,
              memory_mib_per_device: nvidiaShared
                ? nvidiaPreview.profile!.memoryMiBPerDevice
                : facts.protocol.memoryMiBPerDevice!,
              core_limit_percent: nvidiaShared
                ? nvidiaPreview.profile!.coreLimitPercent
                : facts.protocol.coreLimitPercent!,
              compute_units_per_device: facts.protocol.computeUnitsPerDevice,
              max_devices_per_replica:
                resolvedAllocation === "PHYSICAL" &&
                facts.registered?.resourceType.max_devices_per_replica !== 1
                  ? values.max_devices_per_replica
                  : 1,
            },
          ],
        };
        setSummary(input);
        setConfirmed(false);
        setStep(4);
      } else if (confirmed && (frozen || summary)) {
        const input = frozen ?? summary!;
        setGpuInitializationIntent(scope, input);
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
                      !configs.length ||
                      !revision ||
                      !status.data ||
                      status.isError ||
                      Boolean(pendingSupply) ||
                      status.isFetching ||
                      unfinished ||
                      conflictingModels)) ||
                  (step === 2 && !config) ||
                  (step === 3 &&
                    (!allocationType ||
                      !facts.ready ||
                      (nvidiaShared && !nvidiaPreview.profile))) ||
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
              title="初始化提交结果尚未确认"
              content={
                <div className="space-y-2">
                  <p>当前保留原始内容，重发会复用原幂等键。</p>
                  {mutation.error ? (
                    <p className="break-all">{formatGpuInitializationError(mutation.error)}</p>
                  ) : null}
                </div>
              }
            />
          ) : mutation.error ? (
            <Alert
              className="my-4"
              type="error"
              title="初始化提交失败"
              content={formatGpuInitializationError(mutation.error)}
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
                max_devices_per_replica: 1,
              }}
              onChange={(changed, values) => {
                setConfirmed(false);
                if ("pool_mode" in changed) setPoolMode(values.pool_mode ?? "new");
                if ("provider_config_ref" in changed || "allocation_type" in changed) {
                  chooseConfiguration(
                    configs.find((item) => item.provider_config_ref === values.provider_config_ref),
                    "provider_config_ref" in changed ? undefined : values.allocation_type,
                  );
                }
                if ("resource_key" in changed) setResourceKey(values.resource_key ?? "");
                if ("nvidia_parts" in changed) setNvidiaParts(values.nvidia_parts);
              }}
            >
              <div hidden={step !== 1}>
                <div className="flex flex-col gap-5">
                  {supplyFeedback ? (
                    <Alert
                      type={
                        supplyVerified
                          ? "success"
                          : supplyFeedback.state === "failed"
                            ? "error"
                            : "warning"
                      }
                      title={
                        supplyVerified
                          ? "登记状态已核对"
                          : supplyFeedback.state === "registered"
                            ? supplyRefreshed
                              ? "供给配置尚未就绪"
                              : "供给已登记，等待刷新"
                            : supplyFeedback.state === "unknown"
                              ? "登记结果尚未确认"
                              : "供给登记失败"
                      }
                      content={supplyFeedback.message}
                    />
                  ) : null}
                  {pendingSupply && !supplyFeedback ? (
                    <Alert
                      type="warning"
                      content="上次供给登记的结果尚未确认，请打开“查询登记”重发原请求。"
                    />
                  ) : null}
                  <GpuNodeSelection
                    onPrepareSupply={() => setPreparation(true)}
                    onRefreshStatus={async () => {
                      setSupplyVerified(false);
                      if (supplyFeedback?.registrationId) {
                        const registration = await client.fetchQuery({
                          queryKey: [
                            ...acceleratorKeys.all,
                            "supply-registration",
                            supplyFeedback.registrationId,
                          ],
                          queryFn: ({ signal }) =>
                            getGpuSupplyRegistration(supplyFeedback.registrationId!, signal),
                          staleTime: 0,
                          meta: {
                            errorNotification: {
                              id: withId("gpu-supply-registration", cluster.connection_ref),
                              action: "GPU 供给登记结果查询",
                            },
                          },
                        });
                        rememberRegistration(registration);
                      }
                      const result = await status.refetch({ throwOnError: true });
                      setSupplyRefreshed(true);
                      if (supplyFeedback?.state === "registered") {
                        const check = result.data?.checks?.find(
                          (item) => item.key === "provider_configs",
                        );
                        const verified = check?.state === "PASS";
                        setSupplyVerified(verified);
                        setSupplyFeedback((current) =>
                          current
                            ? {
                                ...current,
                                message: verified
                                  ? "已从后端确认供给配置就绪，请选择可纳管节点继续初始化。"
                                  : `登记记录已返回，供给配置检查尚未通过：${check?.reason ? formatGpuInitializationReason(check.reason) : "未返回检查结果"}。请核对检查项和节点状态。`,
                              }
                            : current,
                        );
                      }
                    }}
                    statusRefreshing={status.isFetching}
                    prepareDisabled={busy || unfinished || status.isFetching}
                    checks={status.data?.checks ?? []}
                    connectionRef={cluster.connection_ref}
                    value={nodes}
                    revision={revision}
                    onSnapshot={onSnapshot}
                    onChange={(next) => {
                      setNodes(next);
                      resetConfig();
                      const compatible = commonGpuProviderConfigs(next);
                      if (compatible.length === 1) chooseConfiguration(compatible[0]);
                    }}
                  />
                  {conflictingModels ? (
                    <Alert
                      type="warning"
                      content="所选节点的已观测设备型号没有交集，请调整节点，确保同一供给组使用共同支持的型号。"
                    />
                  ) : null}
                  {!conflictingModels && nodes.length > 0 && !configs.length ? (
                    <Alert
                      type="warning"
                      content="所选节点没有共同支持的已登记 GPU 供给，请分开选择节点创建供给组；不同供给组仍可加入同一资源池。"
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
                <GpuInitializationProfileFields
                  facts={facts}
                  nvidiaPreview={nvidiaPreview}
                  onRefresh={refreshSupplyFacts}
                  onLoadMore={loadMoreSupplyFacts}
                />
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
                facts={!frozen ? facts : undefined}
                nvidiaProfile={!frozen ? nvidiaPreview.profile : undefined}
                nvidiaProfileSource={!frozen ? nvidiaPreview.source : undefined}
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
          onRegistered={rememberRegistration}
          onFeedback={(feedback) => {
            setSupplyFeedback(feedback);
            setSupplyVerified(false);
            setSupplyRefreshed(false);
            // 登记改变发现快照，只有手动刷新后的两个 GET 才能放行初始化。
            onSnapshot("");
          }}
          onCancel={() => setPreparation(false)}
        />
      ) : null}
    </>
  );
}
