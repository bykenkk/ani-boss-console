import { Card, Progress } from "@arco-design/web-react";
import { StatusBadge, type StatusBadgeTone } from "@/components/common";
import type { ComponentHealthSummary } from "../model";

interface HealthSummaryProps {
  summary: ComponentHealthSummary;
  hasData: boolean;
  pending: boolean;
}

export function HealthSummary({ summary, hasData, pending }: HealthSummaryProps) {
  const { total, counts, states } = summary;
  const overall = pending
    ? "加载中"
    : !hasData || total === 0
      ? "-"
      : counts.stopped > 0
        ? "存在停止"
        : counts.degraded > 0
          ? "部分降级"
          : counts.other > 0
            ? "状态待确认"
            : "正常";
  const tone: StatusBadgeTone =
    !hasData || total === 0
      ? "default"
      : counts.stopped > 0
        ? "danger"
        : counts.degraded > 0 || counts.other > 0
          ? "warning"
          : "success";
  const hint = pending
    ? "正在获取组件状态"
    : !hasData || total === 0
      ? "暂无组件状态数据"
      : overall === "正常"
        ? `${total} 个组件 · 副本已全部就绪`
        : `${total} 个组件 · ${total - counts.running} 个组件需关注`;

  return (
    <section
      aria-label="平台健康概览"
      className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-4 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1"
    >
      <Card className="h-full [&_.arco-card-body]:p-5">
        <div className="text-sm text-(--color-text-2)">整体状态</div>
        <div className="my-3">
          <StatusBadge
            value={overall}
            tone={tone}
            className="rounded-xl! px-4! py-2! text-[22px]! leading-7! font-bold!"
          />
        </div>
        <div className="text-xs text-(--color-text-3)">{hint}</div>
      </Card>
      {states
        .filter((state) => state.key !== "other")
        .map((state) => (
          <Card key={state.key} className="h-full [&_.arco-card-body]:p-5">
            <div className="text-sm text-(--color-text-2)">{state.label}</div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span
                className="text-[32px] leading-none font-bold tabular-nums"
                style={{
                  color: !hasData || state.count === 0 ? "var(--color-text-3)" : state.color,
                }}
              >
                {hasData ? state.count : "-"}
              </span>
              <span className="text-xs text-(--color-text-3)">个</span>
            </div>
            <div
              className="mt-3"
              aria-label={`${state.label}占比 ${hasData ? state.percentage : "-"}`}
            >
              <Progress percent={state.percent} color={state.color} showText={false} size="small" />
            </div>
            <div className="mt-2 text-xs text-(--color-text-3)">
              {state.key === "running"
                ? `占全部组件 ${hasData ? state.percentage : "-"}`
                : state.hint}
            </div>
          </Card>
        ))}
    </section>
  );
}
