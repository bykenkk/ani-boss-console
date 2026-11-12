import { useState } from "react";
import { Alert, Button } from "@arco-design/web-react";
import type { GpuClusterTarget } from "@/api/accelerator";
import { RegisterGpuClusterModal } from "../RegisterGpuClusterModal";
interface GpuTargetSummaryProps {
  target?: GpuClusterTarget;
  principal: string;
  canRegister: boolean;
  loading: boolean;
  error?: Error | null;
  onRefresh: () => void;
}
export function GpuTargetSummary({
  target,
  principal,
  canRegister,
  loading,
  error,
  onRefresh,
}: GpuTargetSummaryProps) {
  const [confirming, setConfirming] = useState(false);
  const registered =
    !error && target?.registration_state === "GPU_TARGET_REGISTRATION_STATE_REGISTERED";
  const unregistered =
    !error && target?.registration_state === "GPU_TARGET_REGISTRATION_STATE_UNREGISTERED";
  return (
    <div className="mb-4 flex flex-col gap-3">
      <Alert
        type={registered ? "success" : unregistered ? "info" : "warning"}
        title={
          registered ? "GPU 管理已启用" : unregistered ? "尚未启用 GPU 管理" : "GPU 目标状态未知"
        }
        content={
          <div className="break-all">
            {target ? (
              <>
                {target.display_name} · 目标 UID：{target.cluster_id}
                <br />
              </>
            ) : null}
            {target?.reason ||
              error?.message ||
              (unregistered
                ? "监控可先部署；确认目标后启用 GPU 管理。"
                : registered
                  ? "沿用已有资源池、供给组与规格。"
                  : "正在核对目标及登记状态，请刷新后再操作。")}
          </div>
        }
      />
      <div className="flex gap-3">
        <Button loading={loading} onClick={onRefresh}>
          刷新目标
        </Button>
        {unregistered && canRegister && principal && target.connection_ref ? (
          <Button type="primary" onClick={() => setConfirming(true)}>
            启用 GPU 管理
          </Button>
        ) : null}
        {unregistered && !canRegister ? (
          <span>需要 accelerator:cluster:register 权限才能启用。</span>
        ) : null}
      </div>
      {confirming && unregistered && target ? (
        <RegisterGpuClusterModal
          target={target}
          principal={principal}
          onCancel={() => setConfirming(false)}
        />
      ) : null}
    </div>
  );
}
