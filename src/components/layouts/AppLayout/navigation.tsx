import type { ReactNode } from "react";
import {
  IconApps,
  IconBook,
  IconCalendarClock,
  IconCloud,
  IconDashboard,
  IconEmail,
  IconExport,
  IconLink,
  IconLock,
  IconRobot,
  IconSafe,
  IconSettings,
  IconThunderbolt,
  IconTool,
  IconUser,
  IconUserGroup,
} from "@arco-design/web-react/icon";

export type AppRoute =
  | "/"
  | "/overview-inference"
  | "/overview-kb"
  | "/overview-alerts"
  | "/tenants"
  | "/tenants-quotas"
  | "/tenants-admins"
  | "/tenants-billing"
  | "/ops-pool"
  | "/ops-gpu"
  | "/ops-nodes"
  | "/ops-storage"
  | "/ops-storage-quotas"
  | "/ops-network"
  | "/ops-registry-quota"
  | "/ops-registry-vulnerabilities"
  | "/ops-registry-gc"
  | "/health"
  | "/health-gpu"
  | "/health-inference"
  | "/health-kb"
  | "/health-metrics"
  | "/health-logs"
  | "/health-traces"
  | "/health-alert-rules"
  | "/maint-skills"
  | "/maint-jobs"
  | "/maint-incidents"
  | "/metering"
  | "/audit"
  | "/audit-api-keys"
  | "/audit-inference"
  | "/audit-export"
  | "/settings-platform-admins"
  | "/settings-platform-roles"
  | "/settings-idp"
  | "/settings-session"
  | "/integration-webhook"
  | "/integration-notify"
  | "/integration-ops-system";

export interface NavigationLeaf {
  label: string;
  to: AppRoute;
  icon?: ReactNode;
}

export interface NavigationGroup {
  key: string;
  label: string;
  icon: ReactNode;
  children: readonly NavigationItem[];
}

export type NavigationItem = NavigationLeaf | NavigationGroup;

export interface TopNavigationItem {
  label: string;
  to: AppRoute;
  icon: ReactNode;
}

export function isNavigationGroup(item: NavigationItem): item is NavigationGroup {
  return "children" in item;
}

export const topNavigation: readonly TopNavigationItem[] = [
  { label: "运营概览", to: "/", icon: <IconDashboard /> },
  { label: "租户管理", to: "/tenants", icon: <IconUserGroup /> },
  { label: "资源池管理", to: "/ops-pool", icon: <IconCloud /> },
  { label: "监控告警", to: "/health", icon: <IconTool /> },
  { label: "用量计量", to: "/metering", icon: <IconCalendarClock /> },
  { label: "审计合规", to: "/audit", icon: <IconSafe /> },
  { label: "系统设置", to: "/settings-platform-admins", icon: <IconSettings /> },
  { label: "平台集成与通知", to: "/integration-webhook", icon: <IconApps /> },
];

export const tenantNavigation: readonly NavigationLeaf[] = [
  { label: "租户列表", to: "/tenants", icon: <IconUserGroup /> },
  { label: "配额策略", to: "/tenants-quotas", icon: <IconSettings /> },
  { label: "租户管理员", to: "/tenants-admins", icon: <IconUser /> },
  {
    label: "租户计费与用量",
    to: "/tenants-billing",
    icon: <IconCalendarClock />,
  },
];

export const infrastructureNavigation: readonly NavigationLeaf[] = [
  { label: "平台资源池总览", to: "/ops-pool" },
  { label: "GPU资源池", to: "/ops-gpu", icon: <IconThunderbolt /> },
  { label: "节点状态", to: "/ops-nodes" },
  { label: "存储基础设施", to: "/ops-storage" },
  { label: "租户存储配额", to: "/ops-storage-quotas" },
  { label: "网络基础设施", to: "/ops-network" },
  { label: "镜像配额", to: "/ops-registry-quota" },
  { label: "漏洞扫描", to: "/ops-registry-vulnerabilities" },
  { label: "垃圾回收", to: "/ops-registry-gc" },
];

export const observabilityNavigation: readonly NavigationLeaf[] = [
  { label: "平台健康", to: "/health", icon: <IconDashboard /> },
  { label: "GPU 监控", to: "/health-gpu" },
  { label: "推理监控", to: "/health-inference" },
  { label: "知识库监控", to: "/health-kb" },
  { label: "组件指标", to: "/health-metrics" },
  { label: "运行日志", to: "/health-logs", icon: <IconBook /> },
  { label: "Trace", to: "/health-traces" },
  { label: "告警规则", to: "/health-alert-rules" },
  { label: "运维 Skills", to: "/maint-skills" },
  { label: "任务历史", to: "/maint-jobs" },
  { label: "故障处理", to: "/maint-incidents" },
];

export const meteringNavigation: readonly NavigationLeaf[] = [
  { label: "计量总览", to: "/metering", icon: <IconCalendarClock /> },
];

export const auditNavigation: readonly NavigationLeaf[] = [
  { label: "集群审计", to: "/audit", icon: <IconSafe /> },
  { label: "API Key 审计", to: "/audit-api-keys", icon: <IconLock /> },
  { label: "推理调用审计", to: "/audit-inference", icon: <IconRobot /> },
  { label: "合规导出与取证", to: "/audit-export", icon: <IconExport /> },
];

export const settingsNavigation: readonly NavigationLeaf[] = [
  {
    label: "平台管理员",
    to: "/settings-platform-admins",
    icon: <IconUserGroup />,
  },
  {
    label: "平台角色",
    to: "/settings-platform-roles",
    icon: <IconSafe />,
  },
  { label: "登录与 IdP（预留）", to: "/settings-idp", icon: <IconLock /> },
  {
    label: "会话与安全策略（预留）",
    to: "/settings-session",
    icon: <IconSafe />,
  },
];

export const integrationNavigation: readonly NavigationLeaf[] = [
  { label: "运维 Webhook", to: "/integration-webhook", icon: <IconLink /> },
  { label: "企业通知集成", to: "/integration-notify", icon: <IconEmail /> },
  { label: "运营系统对接", to: "/integration-ops-system", icon: <IconApps /> },
];

const visibleAppRoutes = new Set<AppRoute>([
  "/",
  "/tenants",
  "/tenants-quotas",
  "/tenants-admins",
  "/ops-gpu",
  "/health",
  "/health-logs",
  "/metering",
  "/audit",
  "/settings-platform-admins",
  "/settings-platform-roles",
]);

function filterVisibleNavigation(items: readonly NavigationItem[]): NavigationItem[] {
  const visibleItems: NavigationItem[] = [];

  items.forEach((item) => {
    if (!isNavigationGroup(item)) {
      if (visibleAppRoutes.has(item.to)) visibleItems.push(item);
      return;
    }

    const children = filterVisibleNavigation(item.children);
    if (children.length > 0) visibleItems.push({ ...item, children });
  });

  return visibleItems;
}

const completeAppNavigation: readonly NavigationItem[] = [
  { label: "概览", to: "/", icon: <IconDashboard /> },
  {
    key: "tenant-management",
    label: topNavigation[1].label,
    icon: topNavigation[1].icon,
    children: tenantNavigation,
  },
  {
    key: "infrastructure-operations",
    label: topNavigation[2].label,
    icon: topNavigation[2].icon,
    children: infrastructureNavigation,
  },
  {
    key: "operations-observability",
    label: topNavigation[3].label,
    icon: topNavigation[3].icon,
    children: observabilityNavigation,
  },
  {
    key: "platform-metering",
    label: topNavigation[4].label,
    icon: topNavigation[4].icon,
    children: meteringNavigation,
  },
  {
    key: "security-audit",
    label: topNavigation[5].label,
    icon: topNavigation[5].icon,
    children: auditNavigation,
  },
  {
    key: "platform-settings",
    label: topNavigation[6].label,
    icon: topNavigation[6].icon,
    children: settingsNavigation,
  },
  {
    key: "platform-integrations",
    label: topNavigation[7].label,
    icon: topNavigation[7].icon,
    children: integrationNavigation,
  },
];

export const appNavigation: readonly NavigationItem[] =
  filterVisibleNavigation(completeAppNavigation);
