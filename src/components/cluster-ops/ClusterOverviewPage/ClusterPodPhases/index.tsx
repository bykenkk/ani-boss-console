import { Card, Empty, Skeleton } from "@arco-design/web-react";
import { StatusBadge, type StatusBadgeTone } from "@/components/common";

interface ClusterPodPhasesProps {
  counts?: Record<string, string>;
  showSkeleton: boolean;
}

const phaseDefinitions: Record<string, { label: string; tone: StatusBadgeTone; color: string }> = {
  Running: { label: "运行中", tone: "success", color: "rgb(var(--success-6))" },
  Pending: { label: "等待中", tone: "warning", color: "rgb(var(--warning-6))" },
  Succeeded: { label: "已成功", tone: "info", color: "rgb(var(--primary-6))" },
  Failed: { label: "失败", tone: "danger", color: "rgb(var(--danger-6))" },
  Unknown: { label: "未知", tone: "default", color: "var(--color-fill-4)" },
};

export function ClusterPodPhases({ counts, showSkeleton }: ClusterPodPhasesProps) {
  const phases = [
    ...Object.keys(phaseDefinitions).filter((phase) => counts?.[phase] !== undefined),
    ...Object.keys(counts ?? {}).filter((phase) => !Object.hasOwn(phaseDefinitions, phase)),
  ].map((phase) => ({
    phase,
    count: counts![phase],
    ...(phaseDefinitions[phase] ?? {
      label: phase,
      tone: "default" as const,
      color: "var(--color-fill-4)",
    }),
  }));
  const populatedPhases = phases.filter(({ count }) => Number(count) > 0);
  return (
    <Card bodyStyle={{ padding: 16 }}>
      <section aria-label="Pod 阶段分布" aria-busy={showSkeleton} className="flex flex-col gap-5">
        <h3 className="m-0 text-[15px] leading-normal font-medium">Pod 阶段分布</h3>
        {showSkeleton ? (
          <>
            <Skeleton
              animation
              className="[&_.arco-skeleton-text-row]:h-2!"
              text={{ rows: 1, width: "100%" }}
            />
            <div className="grid grid-cols-2 gap-3 @min-[421px]/overview:grid-cols-3 @min-[601px]/overview:grid-cols-5">
              {Object.keys(phaseDefinitions).map((phase) => (
                <div key={phase} className="flex min-w-0 flex-col gap-1.5">
                  <Skeleton
                    animation
                    style={{ height: 18, alignItems: "center" }}
                    text={{ rows: 1, width: "65%" }}
                  />
                  <Skeleton
                    animation
                    className="pl-3 [&_.arco-skeleton-text-row]:h-6!"
                    style={{ height: 30, alignItems: "center" }}
                    text={{ rows: 1, width: "45%" }}
                  />
                </div>
              ))}
            </div>
          </>
        ) : phases.length ? (
          <>
            {populatedPhases.length ? (
              <div
                role="img"
                aria-label={phases.map(({ label, count }) => `${label} ${count}`).join("，")}
                className="flex h-2 gap-[3px] overflow-hidden rounded"
              >
                {populatedPhases.map(({ phase, count, color }) => (
                  <span
                    key={phase}
                    className="min-w-1 basis-0"
                    style={{ flexGrow: Number(count), backgroundColor: color }}
                  />
                ))}
              </div>
            ) : null}
            <div className="grid grid-cols-2 gap-3 @min-[421px]/overview:grid-cols-3 @min-[601px]/overview:grid-cols-5">
              {phases.map(({ phase, label, count, tone }) => (
                <div key={phase} className="flex min-w-0 flex-col items-start gap-1.5">
                  <StatusBadge
                    value={label}
                    tone={tone}
                    className="min-h-0! rounded-none! bg-transparent! p-0! font-normal! leading-[18px]! text-(--color-text-2)! [&_.arco-badge-status-dot]:h-1.5! [&_.arco-badge-status-dot]:w-1.5! [&_.arco-badge-status-text]:ml-1.5!"
                  />
                  <span className="break-all pl-3 text-xl leading-normal font-medium tabular-nums">
                    {count}
                  </span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <Empty />
        )}
      </section>
    </Card>
  );
}
