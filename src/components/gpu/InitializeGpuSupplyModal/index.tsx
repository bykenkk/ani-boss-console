import { useGpuOperationScope, useGpuPermissions } from "@/hooks/useGpuTarget";
import { useRef } from "react";
import { Alert, Button, Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useStore } from "zustand";
import { acceleratorKeys, createGpuInitialization, type GpuCluster } from "@/api/accelerator";
import { gpuInitializationIntents, setGpuInitializationIntent } from "@/stores/gpu-initialization";
import { GpuSupplyInitialization } from "../GpuSupplyInitialization";

interface InitializeGpuSupplyModalProps {
  cluster: GpuCluster;
  onCancel: () => void;
  onOperation: (operationId: string) => void;
}
export function InitializeGpuSupplyModal({
  cluster,
  onCancel,
  onOperation,
}: InitializeGpuSupplyModalProps) {
  const { scope, scopeKey } = useGpuOperationScope(cluster);
  const { can } = useGpuPermissions();
  const client = useQueryClient();
  const frozen = useStore(gpuInitializationIntents, (state) => state.creates[scopeKey]);
  const lock = useRef(false);
  const replay = useMutation({
    mutationFn: () => {
      if (!frozen) throw new Error("未找到先前的初始化意图");
      return createGpuInitialization(frozen, scope);
    },
    retry: false,
    meta: {
      feedback: { channel: "message", action: "恢复原初始化提交", successText: "已恢复初始化任务" },
    },
    onSuccess: async (operation) => {
      setGpuInitializationIntent(scope);
      await client.invalidateQueries({ queryKey: acceleratorKeys.all });
      if (operation.operation_id) onOperation(operation.operation_id);
    },
    onSettled: () => {
      lock.current = false;
    },
  });
  const beginNew = () =>
    Modal.confirm({
      title: "确认开始新初始化意图",
      content:
        "先前提交的结果尚未确认。开始新意图不会取消已受理的旧任务；应先重发原请求或查询原任务。确认后仅清除此浏览器的待恢复标记。",
      onOk: () => setGpuInitializationIntent(scope),
    });
  return (
    <Modal
      visible
      title="GPU 供给登记与资源池初始化"
      footer={null}
      style={{ width: "min(1280px, calc(100vw - 48px))" }}
      onCancel={onCancel}
    >
      {!scope.principal || !can("accelerator:initialization:create") ? (
        <Alert type="warning" content="当前主体缺少初始化提交权限。" />
      ) : frozen ? (
        <div className="flex flex-col gap-4">
          <Alert
            type="warning"
            title="发现先前结果未确认的初始化提交"
            content="原始正文与原 API 幂等作用域保持不变。请先按原文确认结果；新意图统一使用当前组策略合同。"
          />
          {replay.error ? (
            <Alert
              type="error"
              content={replay.error instanceof Error ? replay.error.message : "原请求恢复失败"}
            />
          ) : null}
          <div className="flex gap-3">
            <Button
              type="primary"
              loading={replay.isPending}
              onClick={() => {
                if (lock.current) return;
                lock.current = true;
                replay.mutate();
              }}
            >
              重发原初始化请求
            </Button>
            <Button disabled={replay.isPending} onClick={beginNew}>
              确认开始新意图
            </Button>
          </div>
        </div>
      ) : (
        <GpuSupplyInitialization cluster={cluster} onOperation={onOperation} />
      )}
    </Modal>
  );
}
