import {
  gpuScopeKey,
  requireGpuOperationTarget,
  type GpuOperationScope,
} from "@/api/accelerator/scope";
import { useGpuPermissions } from "@/hooks/useGpuTarget";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button } from "@arco-design/web-react";
import { DataTable, StatusBadge, type ListColumn } from "@/components/common";
import {
  getInitializationOperation,
  retryInitializationOperation,
  type InitializationOperation as Operation,
} from "@/api/accelerator";
import { withId } from "@/lib/id";
import { supplyReasonText } from "../reasons";
interface InitializationOperationProps {
  scope: GpuOperationScope;
  operationId: string;
}
const columns: ListColumn<NonNullable<Operation["steps"]>[number]>[] = [
  { title: "步骤", dataIndex: "kind", width: 200 },
  { title: "对象", dataIndex: "object_key", width: 200 },
  {
    title: "状态",
    width: 120,
    render: (_, step) => (
      <StatusBadge
        value={step.state}
        tone={
          step.state === "SUCCEEDED"
            ? "success"
            : step.state === "BLOCKED" || step.state === "FAILED"
              ? "warning"
              : "default"
        }
      />
    ),
  },
  { title: "资源 ID", dataIndex: "resource_id", width: 260, ellipsis: true },
  {
    title: "原因",
    width: 400,
    render: (_, step) => (step.reason ? supplyReasonText(step.reason) : "-"),
  },
];
export function InitializationOperation({ operationId, scope }: InitializationOperationProps) {
  const client = useQueryClient();
  const { can } = useGpuPermissions();
  const queryKey = ["accelerator", "initialization-operation", gpuScopeKey(scope), operationId];
  const query = useQuery({
    queryKey,
    queryFn: async ({ signal }) =>
      requireGpuOperationTarget(await getInitializationOperation(operationId, signal), scope),
    refetchInterval: (state) =>
      ["ACCEPTED", "RUNNING"].includes(state.state.data?.state ?? "") ? 2000 : false,
    meta: {
      errorNotification: {
        id: withId("gpu-initialization-operation", operationId),
        action: "初始化任务加载",
      },
    },
  });
  const retry = useMutation({
    mutationFn: () => retryInitializationOperation(operationId, query.data!.version, scope),
    meta: {
      feedback: { channel: "message", action: "重试初始化", successText: "初始化重试已受理" },
    },
    onSuccess: (operation) => {
      client.setQueryData(queryKey, operation);
      client.invalidateQueries({ queryKey: ["accelerator"] });
    },
  });
  const operation = query.data;
  const completed =
    operation?.state === "SUCCEEDED" &&
    Boolean(operation.groups?.length) &&
    operation.groups!.every((group) =>
      ["OPEN", "ADMISSION_OPEN"].includes(group.admission ?? ""),
    ) &&
    Boolean(operation.profiles?.length) &&
    operation.profiles!.every((profile) =>
      ["ACTIVE", "PROFILE_ACTIVE"].includes(profile.recorded_state ?? ""),
    );
  return (
    <div className="flex flex-col gap-4">
      {query.error ? <Alert type="error" content={query.error.message} /> : null}
      <div className="break-all">操作 ID：{operationId}</div>
      <div className="flex items-center gap-4">
        <StatusBadge
          value={operation?.state}
          tone={completed ? "success" : operation?.state === "BLOCKED" ? "warning" : "info"}
          processing={operation?.state === "RUNNING"}
        />
        <span>版本：{operation?.version ?? "-"}</span>
        <span>当前步骤：{operation?.current_step ?? "-"}</span>
        <Button loading={query.isFetching} onClick={() => query.refetch()}>
          刷新
        </Button>
        <Button
          type="primary"
          disabled={!operation?.retryable || !can("accelerator:initialization:retry")}
          loading={retry.isPending}
          onClick={() => retry.mutate()}
        >
          按当前版本重试
        </Button>
      </div>
      {operation?.reason ? (
        <Alert type="warning" content={supplyReasonText(operation.reason)} />
      ) : null}
      {operation?.state === "SUCCEEDED" ? (
        <Alert
          type={completed ? "success" : "warning"}
          content={
            completed
              ? "初始化完成：当前操作成功，新组已开单，规格已启用。"
              : "操作已成功。请核对组接单和规格启用状态后再提供业务使用。"
          }
        />
      ) : (
        <Alert
          type="info"
          content="任务受理不代表资源池完成。请等待操作成功，并核对组接单与规格状态。"
        />
      )}
      <DataTable
        header={{ title: "执行步骤" }}
        rowKey="step_id"
        data={operation?.steps ?? []}
        columns={columns}
        pagination={false}
        loading={query.isFetching}
        tableLabel="初始化执行步骤"
      />
      <DataTable
        header={{ title: "供给组结果" }}
        rowKey="group_id"
        data={operation?.groups ?? []}
        columns={[
          { title: "组 ID", dataIndex: "group_id", width: 280, ellipsis: true },
          { title: "接单状态", dataIndex: "admission", width: 160 },
          { title: "自动开单结果", dataIndex: "auto_open_result", width: 200 },
        ]}
        pagination={false}
        tableLabel="初始化组结果"
      />
      <DataTable
        header={{ title: "规格结果" }}
        rowKey="profile_id"
        data={operation?.profiles ?? []}
        columns={[
          { title: "Profile ID", dataIndex: "profile_id", width: 280, ellipsis: true },
          { title: "版本", dataIndex: "recorded_revision", width: 160 },
          { title: "启用状态", dataIndex: "recorded_state", width: 160 },
        ]}
        pagination={false}
        tableLabel="初始化规格结果"
      />
    </div>
  );
}
