import type { PlatformComponent } from "@/api/platform";

export const groupNames: Record<string, string> = {
  service: "核心服务",
  dependency: "基础依赖",
  platform: "平台组件",
};

export const groupColors: Record<string, { color: string; backgroundColor: string }> = {
  service: { color: "#2b5ce6", backgroundColor: "#e8f0ff" },
  dependency: { color: "#22a06b", backgroundColor: "#e8f7f0" },
  platform: { color: "#7c5ce6", backgroundColor: "#f3edff" },
};

const healthStates = [
  { key: "running", label: "运行中", color: "#22a06b", hint: "副本已全部就绪" },
  { key: "degraded", label: "降级", color: "#e6862b", hint: "副本未全部就绪" },
  { key: "stopped", label: "已停止", color: "#e5484d", hint: "期望副本为 0" },
  { key: "other", label: "其他状态", color: "#9aa3b5", hint: "需进一步确认组件状态" },
] as const;

export function summarizeComponentHealth(components: PlatformComponent[]) {
  const total = components.length;
  const counts = { running: 0, degraded: 0, stopped: 0, other: 0 };
  for (const component of components) {
    switch (component.status) {
      case "running":
      case "degraded":
      case "stopped":
        counts[component.status]++;
        break;
      default:
        counts.other++;
    }
  }

  return {
    total,
    counts,
    states: healthStates.map((state) => ({
      ...state,
      count: counts[state.key],
      percent: total === 0 ? 0 : (counts[state.key] / total) * 100,
      percentage: total === 0 ? "0%" : `${Number(((counts[state.key] / total) * 100).toFixed(1))}%`,
    })),
  };
}

export type ComponentHealthSummary = ReturnType<typeof summarizeComponentHealth>;
