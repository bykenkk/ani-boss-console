import { Button, Tabs, Typography } from "@arco-design/web-react";
import { IconCopy, IconInfoCircle } from "@arco-design/web-react/icon";
import clsx from "clsx";
import { StatusBadge } from "@/components/common";
import { copyToClipboard } from "@/lib/clipboard";

interface GpuSupplyPreparationHandoffProps {
  config: string;
  handoff: string;
  baselineId: string;
}

export function GpuSupplyPreparationHandoff({
  config,
  handoff,
  baselineId,
}: GpuSupplyPreparationHandoffProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Typography.Title heading={6} className="m-0!">
            供给配置预览
          </Typography.Title>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs text-(--color-text-3)">
            <span>基线 ID（Baseline ID）</span>
            <span className="break-all font-mono text-(--color-text-2)">{baselineId}</span>
          </div>
        </div>
        <StatusBadge value="待应用" tone="warning" />
      </div>
      <div className="flex items-start gap-2 text-xs leading-5 text-(--color-text-3)">
        <IconInfoCircle className="mt-1 shrink-0" />
        <span>
          由运维将配置条目合并至目标连接的 <code>provider_configs</code>
          ，保留现有连接和凭据；请勿覆盖完整的
          <code> provider.json</code>。应用后返回初始化复检。
        </span>
      </div>
      <Tabs defaultActiveTab="config">
        {[
          {
            key: "config",
            title: "供给配置条目",
            text: config,
            label: "JSON · provider_configs",
            copyLabel: "复制配置",
          },
          {
            key: "handoff",
            title: "运维交接单",
            text: handoff,
            label: "交接说明 · 供给发布与复检",
            copyLabel: "复制交接单",
          },
        ].map((item) => (
          <Tabs.TabPane key={item.key} title={item.title}>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-(--color-text-3)">{item.label}</span>
              <Button
                size="small"
                icon={<IconCopy />}
                onClick={() => copyToClipboard(item.text, item.title)}
              >
                {item.copyLabel}
              </Button>
            </div>
            <pre
              aria-label={item.label}
              tabIndex={0}
              className={clsx(
                "m-0 max-h-[min(32vh,20rem)] overflow-auto rounded bg-(--color-fill-1) p-4 font-mono text-xs leading-6 text-(--color-text-1)",
                item.key === "config" ? "whitespace-pre" : "whitespace-pre-wrap break-words",
              )}
            >
              {item.text}
            </pre>
          </Tabs.TabPane>
        ))}
      </Tabs>
    </div>
  );
}
