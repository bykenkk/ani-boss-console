import { Progress, Typography } from "@arco-design/web-react";
import type { GpuInitializationOperation } from "@/api/accelerator";
import { StatusBadge } from "@/components/common";
import { gpuInitializationIsRunning, gpuInitializationStatus } from "../../initialization";

const titles: Record<string, string> = {
  ACCEPTED: "初始化任务已受理",
  RUNNING: "初始化任务执行中",
  BLOCKED: "初始化任务等待处理",
  SUCCEEDED: "目录初始化已完成",
  CONFLICT: "初始化计划存在冲突",
  FAILED: "初始化任务执行失败",
};

export function GpuInitializationProgress({
  operation,
  stepLabels,
}: {
  operation?: GpuInitializationOperation;
  stepLabels: Record<string, string>;
}) {
  const steps = operation?.steps ?? [];
  const completed = steps.filter(
    (step) => step.state === "SUCCEEDED" || step.state === "SKIPPED",
  ).length;
  const status = gpuInitializationStatus(operation?.state);
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 py-2">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Typography.Title heading={5} className="m-0! text-lg! font-medium!">
            {titles[operation?.state ?? ""] ?? "初始化任务进度"}
          </Typography.Title>
          <Typography.Text type="secondary" className="text-xs!">
            {operation?.state === "SUCCEEDED"
              ? "资源目录已初始化，可前往资源池查看实际结果。"
              : gpuInitializationIsRunning(operation?.state)
                ? "任务已受理，可以关闭此窗口，后台会继续执行。"
                : "请根据任务返回的状态与处理要求继续操作。"}
          </Typography.Text>
        </div>
        <StatusBadge
          value={status.label}
          tone={status.tone}
          processing={gpuInitializationIsRunning(operation?.state)}
        />
      </div>
      {steps.length ? (
        <div className="flex flex-col gap-2">
          <Typography.Text type="secondary" className="text-xs!">
            已完成 {completed} / {steps.length} 项
          </Typography.Text>
          <Progress
            percent={Math.round((completed / steps.length) * 100)}
            showText={false}
            size="small"
            status={
              operation?.state === "SUCCEEDED"
                ? "success"
                : operation?.state === "BLOCKED"
                  ? "warning"
                  : operation?.state === "FAILED" || operation?.state === "CONFLICT"
                    ? "error"
                    : "normal"
            }
          />
        </div>
      ) : null}
      <ol className="m-0 list-none p-0" aria-label="初始化执行步骤">
        {steps.map((step, index) => {
          const stepStatus = gpuInitializationStatus(step.state);
          return (
            <li
              key={step.step_id ?? `${step.kind}-${step.object_key}-${index}`}
              className="flex items-start gap-3 border-b border-(--color-border-1) py-3 last:border-0"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-(--color-fill-1) text-xs text-(--color-text-3)">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <Typography.Text>
                  {stepLabels[step.kind ?? ""] ?? step.kind ?? "未命名步骤"}
                </Typography.Text>
                {step.reason ? (
                  <div className="mt-1 break-all text-xs text-(--color-text-3)">{step.reason}</div>
                ) : null}
              </div>
              <StatusBadge
                value={stepStatus.label}
                tone={stepStatus.tone}
                processing={step.state === "RUNNING"}
              />
            </li>
          );
        })}
      </ol>
    </div>
  );
}
