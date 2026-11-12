import { useGpuOperationScope, useGpuPermissions } from "@/hooks/useGpuTarget";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Alert, Button, Modal, Tooltip } from "@arco-design/web-react";
import { IconRefresh } from "@arco-design/web-react/icon";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useStore } from "zustand";
import {
  acceleratorKeys,
  listGpuSupplyCandidates,
  registerGpuSupplyConfiguration,
  type GpuCluster,
  type GpuSupplyCandidate,
  type GpuSupplyRegistrationResult,
  type RegisterGpuSupplyConfigurationInput,
} from "@/api/accelerator";
import { ApiError } from "@/api/request";
import { DataTable, StatusBadge, type ListColumn } from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { showMessage } from "@/lib/feedback";
import { withId } from "@/lib/id";
import {
  gpuSupplyRegistrationIntents,
  setGpuSupplyRegistrationIntent,
} from "@/stores/gpu-supply-registration";
import { formatGpuAllocationType } from "../capacity";
import { GpuInitializationContext } from "../GpuInitializationContext";
import { GpuSupplyCandidateDetails } from "./GpuSupplyCandidateDetails";
import {
  buildSupplyRegistrationInput,
  formatSupplyField,
  formatSupplyReason,
  missingSupplyRegistrationFacts,
  type SupplyCandidateDraft,
} from "./registration";
import styles from "../initialization.module.less";

export interface GpuSupplyRegistrationFeedback {
  state: "registered" | "failed" | "unknown";
  message: string;
  registrationId?: string;
}

interface PrepareGpuSupplyModalProps {
  cluster: GpuCluster;
  onCancel: () => void;
  onFeedback: (feedback: GpuSupplyRegistrationFeedback) => void;
  onRegistered: (registration: GpuSupplyRegistrationResult) => void;
}

function supplyColumns(
  drafts: Record<string, SupplyCandidateDraft>,
): ListColumn<GpuSupplyCandidate>[] {
  return [
    { title: "节点", dataIndex: "node.name", width: 200, fixed: "left" },
    { title: "设备型号", width: 140, render: (_, row) => row.model_key || "未获取" },
    {
      title: "供给类型",
      width: 110,
      render: (_, row) => formatGpuAllocationType(row.allocation_type),
    },
    {
      title: "设备显存",
      width: 180,
      render: (_, row) =>
        row.memory_capacity_bytes == null ? "未知" : `${row.memory_capacity_bytes} B`,
    },
    { title: "CU", width: 80, render: (_, row) => row.compute_units_per_device ?? "未知" },
    { title: "资源键", dataIndex: "resource_key", width: 260, ellipsis: true },
    {
      title: "登记检查",
      width: 120,
      render: (_, row) => {
        const missing = missingSupplyRegistrationFacts(row, drafts[row.candidate_id]);
        const missingHardware = missing.filter((field) => field !== "core_budget_additive");
        const needsPolicy = missing.includes("core_budget_additive");
        return (
          <Tooltip
            content={
              row.blocking_reasons.length
                ? row.blocking_reasons.map(formatSupplyReason).join("、")
                : missingHardware.length
                  ? `新登记所需事实尚未取得：${missingHardware.map(formatSupplyField).join("、")}。请核实观测或插件配置后重新查询。`
                  : needsPolicy
                    ? "请在登记设置中选择是否按总算力预算计算容量"
                    : row.runtime_class_name == null && row.adapter_id === "volcano-hami-mib-v1"
                      ? row.runtime_class_candidates.length
                        ? "请从集群实际已有的运行时选项中选择"
                        : "尚无可选择的运行时，请核实集群运行时配置后重新查询"
                      : row.resource_mapping_required
                        ? "待确认资源映射"
                        : "信息已收集"
            }
          >
            <span tabIndex={0}>
              <StatusBadge
                value={
                  row.blocking_reasons.length
                    ? "不可登记"
                    : missingHardware.length
                      ? "事实未获取"
                      : needsPolicy
                        ? "待选择策略"
                        : row.runtime_class_name == null && row.adapter_id === "volcano-hami-mib-v1"
                          ? row.runtime_class_candidates.length
                            ? "待选择运行时"
                            : "缺少运行时"
                          : row.resource_mapping_required
                            ? "待确认"
                            : "可登记"
                }
                tone={
                  row.blocking_reasons.length ||
                  missing.length ||
                  (row.runtime_class_name == null && row.adapter_id === "volcano-hami-mib-v1") ||
                  row.resource_mapping_required
                    ? "warning"
                    : "success"
                }
              />
            </span>
          </Tooltip>
        );
      },
    },
  ];
}

function describeRegistrationError(error: Error) {
  if (!(error instanceof ApiError)) return error.message;
  return [error.message, error.reason, error.requestId ? `请求 ID：${error.requestId}` : ""]
    .filter(Boolean)
    .join("；");
}

export function PrepareGpuSupplyModal({
  cluster,
  onCancel,
  onFeedback,
  onRegistered,
}: PrepareGpuSupplyModalProps) {
  const { scope, scopeKey } = useGpuOperationScope(cluster);
  const { can } = useGpuPermissions();
  const frozen = useStore(gpuSupplyRegistrationIntents, (state) => state.inputs[scopeKey]);
  const [selected, setSelected] = useState<GpuSupplyCandidate[]>([]);
  const [drafts, setDrafts] = useState<Record<string, SupplyCandidateDraft>>({});
  const [receipt, setReceipt] = useState<GpuSupplyRegistrationResult>();
  const lock = useRef(false);
  const revision = useRef("");
  const pagination = useListPagination(cluster.connection_ref, 100);
  const params = {
    connection_ref: cluster.connection_ref,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  const query = useQuery({
    queryKey: [...acceleratorKeys.all, "supply-candidates", params],
    queryFn: ({ signal }) => listGpuSupplyCandidates(params, signal),
    enabled: !frozen && !receipt,
    refetchOnMount: "always",
    meta: {
      errorNotification: {
        id: withId("gpu-supply-candidates", cluster.connection_ref),
        action: "GPU 供给查询",
      },
    },
  });
  useEffect(() => {
    const next = query.data?.discovery_revision;
    if (!next || revision.current === next) return;
    revision.current = next;
    setSelected([]);
    setDrafts({});
  }, [query.data]);
  const mutation = useMutation({
    mutationFn: (input: RegisterGpuSupplyConfigurationInput) =>
      registerGpuSupplyConfiguration(input, scope),
    retry: false,
    meta: {
      feedback: {
        channel: "message",
        action: "GPU 供给登记",
        successText: "供给已登记，请返回刷新状态",
      },
    },
    onMutate: (input) => setGpuSupplyRegistrationIntent(scope, input),
    onSuccess: (result) => {
      setReceipt(result);
      setGpuSupplyRegistrationIntent(scope);
      onRegistered(result);
      onFeedback({
        state: "registered",
        message: "供给已登记，请点击“刷新状态”核对登记后的供给配置与节点。",
        registrationId: result.registration_id,
      });
    },
    onError: (error) => {
      const definitive =
        error instanceof ApiError &&
        Boolean(error.status) &&
        error.status! < 500 &&
        error.status !== 408;
      if (definitive) setGpuSupplyRegistrationIntent(scope);
      onFeedback({
        state: definitive ? "failed" : "unknown",
        message: describeRegistrationError(error),
      });
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  const busy = !scope.principal || !can("accelerator:supply:register") || mutation.isPending;
  const selectedNeedsFacts = selected.some(
    (candidate) =>
      missingSupplyRegistrationFacts(candidate, drafts[candidate.candidate_id]).length > 0,
  );
  const selectedNeedsRuntime = selected.some(
    (candidate) =>
      candidate.adapter_id === "volcano-hami-mib-v1" &&
      candidate.runtime_class_name == null &&
      !drafts[candidate.candidate_id]?.runtimeClassName,
  );
  const submit = () => {
    if (lock.current || busy) return;
    let input: RegisterGpuSupplyConfigurationInput;
    try {
      input =
        frozen ??
        buildSupplyRegistrationInput(
          cluster.connection_ref,
          query.data?.discovery_revision ?? "",
          selected,
          drafts,
        );
    } catch (error) {
      showMessage({ type: "error", content: { error, fallback: "请核对供给登记信息" } });
      return;
    }
    lock.current = true;
    mutation.mutate(input);
  };
  return (
    <Modal
      visible
      title={
        <div className="pr-6 text-left">
          <div className="text-xl font-medium">查询登记 GPU 供给</div>
          <div className="mt-1 text-xs font-normal text-(--color-text-3)">
            自动读取设备与安装事实，仅设置登记名称和管理员策略，确认后继续初始化。
          </div>
        </div>
      }
      className={clsx(styles.modal, styles.task)}
      style={{ width: 1040, maxWidth: "calc(100vw - 48px)" }}
      onCancel={() => {
        if (!busy) onCancel();
      }}
      closable={!busy}
      escToExit={!busy}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-(--color-text-3)">
            登记后返回初始化，点击“刷新状态”复核。
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button disabled={busy} onClick={onCancel}>
              返回初始化
            </Button>
            {!receipt ? (
              <Button
                type="primary"
                loading={busy}
                disabled={
                  !frozen &&
                  (!selected.length ||
                    selectedNeedsFacts ||
                    selectedNeedsRuntime ||
                    query.isFetching ||
                    query.isError ||
                    !query.data?.discovery_revision)
                }
                onClick={submit}
              >
                {frozen ? "重发原登记请求" : "确认登记"}
              </Button>
            ) : null}
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <GpuInitializationContext cluster={cluster} />
        {receipt ? (
          <Alert
            type="success"
            title="供给登记成功"
            content={
              <div className="space-y-2">
                <p>请返回初始化页面并点击“刷新状态”，读取最新节点和供给配置。</p>
                <p className="break-all text-xs">登记 ID：{receipt.registration_id}</p>
                {receipt.configurations.map((item) => (
                  <p key={item.provider_config_ref} className="break-all text-xs">
                    {item.display_name} · {item.nodes.map((node) => node.name).join("、")} ·{" "}
                    {item.provider_config_ref}
                  </p>
                ))}
              </div>
            }
          />
        ) : (
          <>
            {frozen ? (
              <Alert
                type="warning"
                title={busy ? "正在确认登记" : "登记结果尚未确认"}
                content={
                  <div className="space-y-2">
                    <p>
                      {busy
                        ? "正在提交已核对的供给信息。"
                        : "原始内容已保留，请重发原登记请求确认结果。"}
                    </p>
                    {frozen.registrations.map((item) => (
                      <p key={item.client_key}>
                        {item.display_name} · {item.candidate_ids.length} 项供给
                      </p>
                    ))}
                  </div>
                }
              />
            ) : (
              <>
                <DataTable
                  header={{
                    title: "已收集的供给",
                    extra: (
                      <Button
                        icon={<IconRefresh spin={query.isFetching} />}
                        disabled={query.isFetching}
                        onClick={() => {
                          setSelected([]);
                          setDrafts({});
                          mutation.reset();
                          query.refetch();
                        }}
                      >
                        重新查询
                      </Button>
                    ),
                  }}
                  rowKey="candidate_id"
                  columns={supplyColumns(drafts)}
                  data={query.data?.items ?? []}
                  loading={query.isFetching}
                  tableLabel="可登记 GPU 供给"
                  noDataElement="尚未查询到供给，请核对设备插件、exporter 和 Prometheus 配置后重新查询。"
                  pagination={
                    Number(query.data?.total ?? "0") <= pagination.pageSize && pagination.page === 1
                      ? false
                      : {
                          page: pagination.page,
                          pageSize: pagination.pageSize,
                          total: Number(query.data?.total ?? "0"),
                          onPageChange: pagination.setPage,
                          onPageSizeChange: pagination.setPageSize,
                          pageSizeOptions: [20, 50, 100],
                          disabled: query.isFetching,
                        }
                  }
                  rowSelection={{
                    type: "checkbox",
                    fixed: true,
                    preserveSelectedRowKeys: true,
                    checkCrossPage: true,
                    selectedRowKeys: selected.map((row) => row.candidate_id),
                    checkboxProps: (row) => ({
                      disabled: query.isFetching || Boolean(row.blocking_reasons.length),
                    }),
                    onChange: (keys) => {
                      const available = new Map(
                        [...selected, ...(query.data?.items ?? [])].map((row) => [
                          row.candidate_id,
                          row,
                        ]),
                      );
                      setSelected(
                        keys.flatMap((key) => {
                          const row = available.get(String(key));
                          return row && !row.blocking_reasons.length ? [row] : [];
                        }),
                      );
                      mutation.reset();
                    },
                  }}
                />
                <p className="text-xs text-(--color-text-3)">
                  已选 {selected.length} 项，共 {query.data?.total ?? "0"}{" "}
                  项。勾选后查看接口已返回的只读事实；未取得的设备参数请核实采集或插件配置后重查。
                  本次新登记的缺项不影响使用已有有效供给继续初始化。
                </p>
                {selected.map((candidate) => (
                  <GpuSupplyCandidateDetails
                    key={candidate.candidate_id}
                    candidate={candidate}
                    draft={drafts[candidate.candidate_id] ?? {}}
                    onChange={(draft) => {
                      setDrafts((current) => ({ ...current, [candidate.candidate_id]: draft }));
                      mutation.reset();
                    }}
                    disabled={busy || query.isFetching}
                  />
                ))}
              </>
            )}
            {mutation.error ? (
              <Alert
                type={frozen ? "warning" : "error"}
                title={frozen ? "登记结果未确认" : "供给登记失败"}
                content={describeRegistrationError(mutation.error)}
              />
            ) : null}
          </>
        )}
      </div>
    </Modal>
  );
}
