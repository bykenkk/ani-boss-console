import {
  gpuScopeKey,
  requireGpuOperationTarget,
  requireGpuSupplyTarget,
} from "@/api/accelerator/scope";
import { useReducer, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, Input, Modal, Tabs } from "@arco-design/web-react";
import { currentUserQueryKey, fetchCurrentUser } from "@/api/auth";
import {
  beginNewInitializationIntent,
  createInitialization,
  getInitialization,
  readInitializationDraft,
  type CreateInitializationInput,
  type GpuCluster,
} from "@/api/accelerator";
import { ApiError } from "@/api/request";
import { withId } from "@/lib/id";
import { SupplyConfigurationRecovery } from "./SupplyConfigurationRecovery";
import { SupplyRegistration } from "./SupplyRegistration";
import { GroupPolicySetup } from "./GroupPolicySetup";
import { ExistingGroupProfiles } from "./ExistingGroupProfiles";
import { InitializationOperation } from "./InitializationOperation";
import { supplyReasonText } from "./reasons";
import {
  initializationFlowHasSubmission,
  initializationFlowReducer,
  restoreInitializationFlow,
} from "./flow";
interface GpuSupplyInitializationProps {
  cluster: GpuCluster;
  onOperation?: (operationId: string) => void;
}
export function GpuSupplyInitialization({ cluster, onOperation }: GpuSupplyInitializationProps) {
  const me = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
  });
  if (me.data?.id === undefined)
    return <Alert type="info" content="正在读取平台主体，以恢复此连接的初始化意图。" />;
  return (
    <GpuSupplyInitializationFlow
      key={`${me.data.id}:${cluster.connection_ref}:${cluster.cluster_id}`}
      cluster={cluster}
      principal={String(me.data.id)}
      onOperation={onOperation}
    />
  );
}
interface GpuSupplyInitializationFlowProps {
  cluster: GpuCluster;
  principal: string;
  onOperation?: (operationId: string) => void;
}
function GpuSupplyInitializationFlow({
  cluster,
  principal,
  onOperation,
}: GpuSupplyInitializationFlowProps) {
  const client = useQueryClient();
  const scope = {
    principal,
    connection_ref: cluster.connection_ref,
    cluster_id: cluster.cluster_id,
  };
  const scopeKey = gpuScopeKey(scope);
  const [flow, dispatch] = useReducer(initializationFlowReducer, undefined, () =>
    restoreInitializationFlow(readInitializationDraft(scope)),
  );
  const { tab, providerRef, operationId, pending, rejectedReason } = flow;
  const hasSubmission = initializationFlowHasSubmission(flow);
  const [lookupOperation, setLookupOperation] = useState("");
  const status = useQuery({
    queryKey: ["accelerator", "initialization", scopeKey],
    queryFn: async ({ signal }) =>
      requireGpuOperationTarget(
        requireGpuSupplyTarget(await getInitialization(cluster.connection_ref, signal), scope),
        scope,
      ),
    meta: {
      errorNotification: {
        id: withId("gpu-initialization", cluster.connection_ref),
        action: "GPU 初始化状态加载",
      },
    },
  });
  const submit = useMutation({
    mutationFn: (input: CreateInitializationInput) => createInitialization(input, scope),
    onMutate: (input) => {
      dispatch({ type: "submitting", input });
    },
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.status &&
        error.status >= 400 &&
        error.status < 500 &&
        error.status !== 408
      )
        dispatch({ type: "rejected", reason: error.reason ?? error.message });
    },
    onSuccess: async (operation) => {
      dispatch({ type: "accepted", operationId: operation.operation_id });
      onOperation?.(operation.operation_id);
      await client.invalidateQueries({ queryKey: ["accelerator"] });
    },
    meta: {
      feedback: { channel: "message", action: "GPU 初始化提交", successText: "初始化已受理" },
    },
  });
  const newIntent = () =>
    Modal.confirm({
      title: "开始下一次初始化",
      content: pending
        ? "当前提交结果尚未确认，应先按原文重试或查询任务。确认开始新意图将使用新的提交键，且不会取消已受理的旧任务。"
        : "下一次初始化将使用新的提交键和重新预览的配置。已登记供给和已受理的旧任务都会保留，可继续查看旧任务结果。",
      onOk: () => {
        beginNewInitializationIntent(scope);
        dispatch({ type: "new-intent-confirmed" });
        client.invalidateQueries({
          queryKey: ["accelerator", "discovered-nodes", scopeKey],
        });
      },
    });
  const submissionNotice = (
    <div className="flex flex-col gap-3">
      <Alert
        type="info"
        content={
          pending
            ? "已有提交需要先确认结果。原意图的正文保持不变；可按原文恢复，或确认后开始下一次初始化。"
            : "已有初始化任务。新选用的供给已保留；开始下一次初始化后，即可为它选择节点并重新预览策略。"
        }
      />
      <div className="flex gap-3">
        <Button
          onClick={() =>
            dispatch(
              flow.submittedOperationId
                ? { type: "view-operation", operationId: flow.submittedOperationId }
                : { type: "tab", tab: "operation" },
            )
          }
        >
          查看已有提交
        </Button>
        <Button type="primary" disabled={submit.isPending} onClick={newIntent}>
          开始下一次初始化
        </Button>
      </div>
    </div>
  );
  return (
    <div className="flex flex-col gap-4">
      <div className="break-all">
        {cluster.display_name} · 目录 ID：{cluster.cluster_id} · 连接：{cluster.connection_ref}
      </div>
      {status.data?.registered === false ? (
        <Alert
          type="warning"
          content="目标尚未启用。请返回目标页确认并启用 GPU 管理；监控可独立先部署。"
        />
      ) : null}
      {pending ? (
        <div className="flex flex-col gap-3">
          <Alert
            type="warning"
            title={submit.isPending ? "正在提交" : rejectedReason ? "提交未通过" : "结果未确认"}
            content={
              rejectedReason
                ? supplyReasonText(rejectedReason)
                : "已保存原始正文和幂等键。断线、超时、取消或刷新后按原文重试，不会先查询实时节点。"
            }
          />
          <div className="flex gap-3">
            <Button
              type="primary"
              disabled={!principal}
              loading={submit.isPending}
              onClick={() => submit.mutate(pending)}
            >
              原文重试提交
            </Button>
            <Button disabled={!principal || submit.isPending} onClick={newIntent}>
              确认新意图并重新预览
            </Button>
          </div>
        </div>
      ) : null}
      <Tabs activeTab={tab} onChange={(tab) => dispatch({ type: "tab", tab })}>
        <Tabs.TabPane key="supply" title="供给登记 / 读取">
          <SupplyConfigurationRecovery
            scope={scope}
            onSelect={(ref) => {
              dispatch({ type: "provider", providerRef: ref, continue: true });
            }}
          />
          <SupplyRegistration
            scope={scope}
            onRegistered={(configuration) => {
              dispatch({
                type: "provider",
                providerRef: configuration.provider_config_ref,
                continue: true,
              });
            }}
          />
        </Tabs.TabPane>
        <Tabs.TabPane key="group" title="节点、策略与规格">
          {hasSubmission ? (
            submissionNotice
          ) : (
            <GroupPolicySetup
              scope={scope}
              cluster={cluster}
              providerRef={providerRef}
              onProviderChange={(providerRef) => dispatch({ type: "provider", providerRef })}
              onSubmit={(input) => submit.mutate(input)}
              submitting={submit.isPending || !principal}
            />
          )}
        </Tabs.TabPane>
        <Tabs.TabPane key="existing" title="已有组规格">
          {hasSubmission ? (
            submissionNotice
          ) : (
            <ExistingGroupProfiles
              scope={scope}
              cluster={cluster}
              onSubmit={(input) => submit.mutate(input)}
              submitting={submit.isPending || !principal}
            />
          )}
        </Tabs.TabPane>
        <Tabs.TabPane key="operation" title="提交与恢复">
          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <Input
                aria-label="已知初始化操作 ID"
                value={lookupOperation}
                onChange={setLookupOperation}
                placeholder="已知 operation_id"
              />
              <Button
                disabled={!lookupOperation.trim()}
                onClick={() =>
                  dispatch({ type: "view-operation", operationId: lookupOperation.trim() })
                }
              >
                查询操作
              </Button>
              {status.data?.latest_operation?.cluster_id === cluster.cluster_id ? (
                <Button
                  onClick={() =>
                    dispatch({
                      type: "view-operation",
                      operationId: status.data!.latest_operation!.operation_id,
                    })
                  }
                >
                  查看最近任务
                </Button>
              ) : null}
              <Button disabled={!principal || submit.isPending} onClick={newIntent}>
                开始新意图
              </Button>
            </div>
            {operationId && onOperation ? (
              <div>
                <Button type="primary" onClick={() => onOperation(operationId)}>
                  打开任务详情与资源导航
                </Button>
              </div>
            ) : null}
            {operationId ? (
              <InitializationOperation
                key={`${scopeKey}:${operationId}`}
                scope={scope}
                operationId={operationId}
              />
            ) : (
              <Alert
                type="info"
                content="受理后保留 operation ID，可在此继续查询。同一浏览器会恢复该平台主体、连接与目标 UID 的草稿；新浏览器可选择既有供给或查看最近任务。"
              />
            )}
          </div>
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
}
