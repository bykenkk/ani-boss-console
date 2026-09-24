import { Card, Empty } from "@arco-design/web-react";
import { IconApps, IconCloud, IconStorage } from "@arco-design/web-react/icon";
import type { PlatformComponentGroup } from "@/api/platform";
import { groupColors, groupNames } from "../model";

const scopeMeta = {
  service: { icon: IconApps, description: "ANI 关键链路" },
  dependency: { icon: IconStorage, description: "数据库 / 消息 / 缓存" },
  platform: { icon: IconCloud, description: "调度 / 网络 / 存储" },
};

interface ComponentScopeProps {
  groups: PlatformComponentGroup[];
  pending: boolean;
}

export function ComponentScope({ groups, pending }: ComponentScopeProps) {
  return (
    <Card className="h-full [&_.arco-card-body]:p-5">
      <h3 className="m-0 mb-4 text-base font-semibold text-(--color-text-1)">组件范围</h3>
      <div className="space-y-3">
        {groups.map((group) => {
          const meta = scopeMeta[group.name as keyof typeof scopeMeta];
          const Icon = meta?.icon ?? IconApps;
          return (
            <div
              key={group.name}
              className="flex items-center gap-3 rounded-xl bg-(--color-fill-1) px-4 py-3"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg"
                style={groupColors[group.name]}
                aria-hidden
              >
                <Icon />
              </span>
              <div className="min-w-0">
                <div className="text-sm text-(--color-text-1)">
                  {groupNames[group.name] || group.name || "-"}
                </div>
                {meta ? (
                  <div className="mt-0.5 text-xs text-(--color-text-3)">{meta.description}</div>
                ) : null}
              </div>
              <div className="ml-auto flex shrink-0 items-baseline gap-1">
                <strong className="text-lg text-(--color-text-1) tabular-nums">
                  {group.components.length}
                </strong>
                <span className="text-xs text-(--color-text-3)">个</span>
              </div>
            </div>
          );
        })}
        {groups.length === 0 ? (
          pending ? (
            <div className="py-7 text-sm text-(--color-text-3)">正在获取组件范围</div>
          ) : (
            <Empty description="暂无组件范围数据" />
          )
        ) : null}
      </div>
    </Card>
  );
}
