import { Tooltip } from "@arco-design/web-react";
import clsx from "clsx";
import { StatusBadge } from "@/components/common";
import type { nodeSummary } from "../ClusterNodesPage/node-summary";

interface NodeStatusProps {
  summary: ReturnType<typeof nodeSummary>;
  vertical?: boolean;
}

export function NodeStatus({ summary, vertical = false }: NodeStatusProps) {
  return (
    <div
      className={clsx(
        "flex",
        vertical ? "flex-col items-start gap-1" : "flex-wrap items-center gap-2",
      )}
    >
      <span title={summary.statusDescription}>
        <StatusBadge value={summary.value} tone={summary.tone} />
      </span>
      {summary.unschedulable ? <StatusBadge value="禁止调度" tone="warning" /> : null}
      {summary.taints.length ? (
        <Tooltip
          trigger={["hover", "focus"]}
          content={
            <div className="flex max-w-sm flex-col gap-2 break-all">
              <span className="font-medium">污点（{summary.taints.length}）</span>
              {summary.taints.map((taint, index) => (
                <span key={index}>{taint}</span>
              ))}
            </div>
          }
        >
          <span
            tabIndex={0}
            className="text-xs text-(--color-text-2)"
            aria-label={`${summary.taints.length} 个污点，聚焦查看明细`}
          >
            污点 {summary.taints.length}
          </span>
        </Tooltip>
      ) : null}
    </div>
  );
}
