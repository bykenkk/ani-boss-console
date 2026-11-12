import { useEffect, useRef, useState } from "react";
import { Alert, Button, Collapse, Descriptions, Modal } from "@arco-design/web-react";
import { IconCloud } from "@arco-design/web-react/icon";
import clsx from "clsx";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import {
  acceleratorKeys,
  getGpuInitializationOperation,
  retryGpuInitialization,
  type GpuCluster,
  type GpuInitializationStep,
} from "@/api/accelerator";
import { ApiError } from "@/api/request";
import { DataTable, StatusBadge, type ListColumn } from "@/components/common";
import { showMessage, showNotification, closeNotification } from "@/lib/feedback";
import { withId } from "@/lib/id";
import {
  gpuInitializationIntents,
  setGpuInitializationRetryIntent,
} from "@/stores/gpu-initialization";
import {
  gpuInitializationCanRetry,
  gpuInitializationIsRunning,
  gpuInitializationStatus,
} from "../initialization";
import { GpuInitializationResults } from "./GpuInitializationResults";
import { GpuInitializationProgress } from "./GpuInitializationProgress";
import { GpuInitializationContext } from "../GpuInitializationContext";
import { formatGpuInitializationError } from "../InitializeGpuPoolModal/presentation";
import styles from "../initialization.module.less";

interface GpuInitializationOperationModalProps {
  cluster: GpuCluster;
  operationId: string;
  onCancel: () => void;
  onViewResources: () => void;
}

const stepLabels: Record<string, string> = {
  VALIDATE: "核对发现快照",
  ENSURE_CLUSTER: "确认集群登记",
  ENSURE_POOL: "创建或复用资源池",
  ADOPT_GROUP: "纳管供给组",
  ENSURE_LABELS: "同步节点标签",
  CREATE_PROFILE: "创建规格",
  VERIFY_OPEN: "核对接单条件",
  OPEN_GROUP: "开启供给接单",
  COMPLETE: "完成",
};
const columns: ListColumn<GpuInitializationStep>[] = [
  {
    title: "执行步骤",
    width: 200,
    ellipsis: true,
    render: (_, row) => stepLabels[row.kind ?? ""] ?? row.kind,
  },
  { title: "对象", dataIndex: "object_key", width: 160, ellipsis: true },
  {
    title: "状态",
    width: 120,
    render: (_, row) => {
      const status = gpuInitializationStatus(row.state);
      return (
        <StatusBadge value={status.label} tone={status.tone} processing={row.state === "RUNNING"} />
      );
    },
  },
  { title: "原因", dataIndex: "reason", width: 220, ellipsis: true },
  { title: "资源 ID", dataIndex: "resource_id", width: 220, ellipsis: true },
];

export function GpuInitializationOperationModal({
  cluster,
  operationId,
  onCancel,
  onViewResources,
}: GpuInitializationOperationModalProps) {
  const client = useQueryClient();
  const frozen = useStore(gpuInitializationIntents, (state) => state.retries[operationId]);
  const [checking, setChecking] = useState(false);
  const lock = useRef(false);
  const queryKey = [...acceleratorKeys.all, "initialization-operation", operationId];
  // GPU 初始化需要真实任务闭环，局部接入轮询；其他资源创建/删除的 task 暂缓规则不变。
  const query = useQuery({
    queryKey,
    queryFn: ({ signal }) => getGpuInitializationOperation(operationId, signal),
    refetchOnMount: "always",
    refetchInterval: (query) =>
      gpuInitializationIsRunning(query.state.data?.state) ? 3000 : false,
    meta: {
      errorNotification: {
        id: withId("gpu-initialization-operation", operationId),
        action: "GPU 初始化任务加载",
      },
    },
  });
  const operation = query.data;
  const feedbackId = withId("gpu-initialization-progress", operationId);
  const lastState = useRef<string>();
  useEffect(() => {
    if (!operation?.state || lastState.current === operation.state) return;
    lastState.current = operation.state;
    const running = gpuInitializationIsRunning(operation.state);
    showNotification({
      id: feedbackId,
      state: running
        ? "loading"
        : operation.state === "SUCCEEDED"
          ? "success"
          : operation.state === "BLOCKED"
            ? "warning"
            : "error",
      action: "GPU 资源池初始化",
      title: running
        ? "GPU 资源池初始化中"
        : `GPU 资源池初始化${gpuInitializationStatus(operation.state).label}`,
    });
    if (!running) client.invalidateQueries({ queryKey: acceleratorKeys.all });
  }, [operation?.state, client, feedbackId]);
  useEffect(
    () => () => {
      closeNotification(feedbackId);
      lastState.current = undefined;
    },
    [feedbackId],
  );
  const mutation = useMutation({
    mutationFn: retryGpuInitialization,
    retry: false,
    meta: {
      feedback: {
        channel: "notification",
        id: withId("gpu-initialization-retry", operationId),
        action: "GPU 初始化重试",
        successText: "初始化重试已提交",
      },
    },
    onSuccess: async (next) => {
      setGpuInitializationRetryIntent(operationId);
      client.setQueryData(queryKey, next);
      await client.invalidateQueries({ queryKey: acceleratorKeys.all });
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.status && error.status < 500 && error.status !== 408) {
        setGpuInitializationRetryIntent(operationId);
        await query.refetch();
      }
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  const retry = async () => {
    if (lock.current) return;
    lock.current = true;
    setChecking(true);
    let submitted = false;
    try {
      let input = frozen;
      if (!input) {
        const result = await query.refetch();
        if (result.error) return;
        const current = result.data;
        if (
          !gpuInitializationCanRetry(current?.state, current?.retryable) ||
          !/^[1-9]\d*$/.test(current?.version ?? "")
        ) {
          showMessage({ type: "info", content: "任务状态已更新，请重新查看" });
          return;
        }
        input = { operation_id: operationId, expected_version: current!.version! };
      }
      // 重试请求自身结果未知时重发原版本与原正文，不以新查询版本改写同一幂等意图。
      setGpuInitializationRetryIntent(operationId, input);
      submitted = true;
      mutation.mutate(input);
    } finally {
      setChecking(false);
      if (!submitted) lock.current = false;
    }
  };
  const busy = checking || mutation.isPending;
  const status = gpuInitializationStatus(operation?.state);
  return (
    <Modal
      visible
      title={
        <div className="pr-6 text-left">
          <div className="text-xl font-medium">GPU 资源池初始化任务</div>
          <div className="mt-1 text-xs font-normal text-(--color-text-3)">
            查看后台执行进度与逐项初始化结果。
          </div>
        </div>
      }
      style={{ width: "min(1040px, calc(100vw - 48px))" }}
      className={clsx(styles.modal, styles.task)}
      onCancel={() => {
        if (!busy) onCancel();
      }}
      closable={!busy}
      escToExit={!busy}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs text-(--color-text-3)">
            <IconCloud />
            {gpuInitializationIsRunning(operation?.state)
              ? "关闭窗口后，后台任务继续执行"
              : "已完成的资源结果会保留"}
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <Button disabled={busy} onClick={onCancel}>
              关闭
            </Button>
            <Button
              disabled={busy || query.isFetching}
              type="text"
              onClick={() => query.refetch()}
              loading={query.isFetching}
            >
              刷新进度
            </Button>
            {frozen || gpuInitializationCanRetry(operation?.state, operation?.retryable) ? (
              <Button type="primary" loading={busy} onClick={retry}>
                {frozen ? "重发原重试请求" : "重试当前任务"}
              </Button>
            ) : null}
            <Button
              type={operation?.state === "SUCCEEDED" ? "primary" : "secondary"}
              disabled={busy}
              onClick={onViewResources}
            >
              查看资源池
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex min-w-0 flex-col gap-4">
        <GpuInitializationContext cluster={cluster} />
        <GpuInitializationProgress operation={operation} stepLabels={stepLabels} />
        {operation?.state === "SUCCEEDED" ? (
          <Alert content="目录初始化已完成。接单状态以实际结果为准，实机计算和监控需独立验收。" />
        ) : null}
        {operation?.state === "BLOCKED" ? (
          <Alert
            type="warning"
            title="任务需要处理后继续"
            content={
              <div className="flex flex-col gap-2">
                <span className="break-all">
                  {operation.reason || "请核对受管环境，按任务返回的要求处理后重试。"}
                </span>
                {operation.required_actions?.length ? (
                  <ul className="m-0 list-disc pl-4">
                    {operation.required_actions.map((action, index) => (
                      <li key={`${index}-${action}`} className="break-all">
                        {action}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            }
          />
        ) : null}
        {operation?.state === "FAILED" || operation?.state === "CONFLICT" ? (
          <Alert
            type="warning"
            title="当前任务不可直接重试"
            content={
              <div className="flex flex-col gap-2">
                {operation.reason ? <span className="break-all">{operation.reason}</span> : null}
                <span>请核对已完成资源和失败原因，由运维处理后重新发现节点并核对计划。</span>
                {operation.required_actions?.length ? (
                  <ul className="m-0 list-disc pl-4">
                    {operation.required_actions.map((action, index) => (
                      <li key={`${index}-${action}`} className="break-all">
                        {action}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            }
          />
        ) : null}
        {mutation.error ? (
          <Alert
            type={frozen ? "warning" : "error"}
            title="初始化重试失败"
            content={
              <div className="flex flex-col gap-2">
                <span className="break-all">{formatGpuInitializationError(mutation.error)}</span>
                {frozen ? (
                  <span>
                    本次请求结果仍未确认。原始内容、幂等键和任务版本已保留，请使用“重发原重试请求”确认结果，不另建重试意图。
                  </span>
                ) : null}
              </div>
            }
          />
        ) : null}
        {frozen && !mutation.error ? (
          <Alert
            type="warning"
            content="上次重试请求的结果尚未确认。重发将使用原幂等键和原任务版本，不会创建新的重试意图。"
          />
        ) : null}
        <Collapse bordered={false}>
          <Collapse.Item name="details" header="任务详细信息">
            <Descriptions
              column={2}
              data={[
                { label: "任务 ID", value: <span className="break-all">{operationId}</span> },
                { label: "任务版本", value: operation?.version ?? "-" },
                { label: "状态", value: `${status.label} / ${operation?.state ?? "-"}` },
                {
                  label: "当前步骤",
                  value:
                    stepLabels[operation?.current_step ?? ""] ?? operation?.current_step ?? "-",
                },
                {
                  label: "原因",
                  value: <span className="break-all">{operation?.reason || "-"}</span>,
                },
              ]}
            />
            <div className="mt-4">
              <DataTable
                rowKey={(row) => row.step_id ?? `${row.kind}-${row.object_key}`}
                columns={columns}
                data={operation?.steps ?? []}
                loading={query.isFetching}
                pagination={false}
                tableLabel="初始化执行步骤"
              />
            </div>
          </Collapse.Item>
          {operation &&
          (operation.groups?.length || operation.pools?.length || operation.profiles?.length) ? (
            <Collapse.Item name="results" header="资源标识与执行结果">
              <GpuInitializationResults operation={operation} />
            </Collapse.Item>
          ) : null}
        </Collapse>
      </div>
    </Modal>
  );
}
