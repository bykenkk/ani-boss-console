import type { ReactNode } from "react";
import type { AppRoute } from "@/lib/navigation";
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

export function isNavigationGroup(item: NavigationItem): item is NavigationGroup {
  return "children" in item;
}

const tenantNavigation: readonly NavigationLeaf[] = [
  { label: "租户列表", to: "/tenants", icon: <IconUserGroup /> },
  { label: "配额策略", to: "/tenants-quotas", icon: <IconSettings /> },
  { label: "租户管理员", to: "/tenants-admins", icon: <IconUser /> },
  {
    label: "租户计费与用量",
    to: "/tenants-billing",
    icon: <IconCalendarClock />,
  },
];

const infrastructureNavigation: readonly NavigationLeaf[] = [
  { label: "平台资源池总览", to: "/pool" },
  { label: "GPU 资源池", to: "/gpu", icon: <IconThunderbolt /> },
  { label: "GPU 配额", to: "/gpu-quotas", icon: <IconSettings /> },
  { label: "节点状态", to: "/nodes" },
  { label: "存储基础设施", to: "/storage" },
  { label: "租户存储配额", to: "/storage-quotas" },
  { label: "网络基础设施", to: "/network" },
  { label: "镜像配额", to: "/registry-quota" },
  { label: "漏洞扫描", to: "/registry-vulnerabilities" },
  { label: "垃圾回收", to: "/registry-gc" },
];

const observabilityNavigation: readonly NavigationLeaf[] = [
  { label: "平台健康", to: "/health", icon: <IconDashboard /> },
  { label: "GPU 监控", to: "/health-gpu" },
  { label: "推理监控", to: "/health-inference" },
  { label: "知识库监控", to: "/health-kb" },
  { label: "组件指标", to: "/metrics" },
  { label: "运行日志", to: "/logs", icon: <IconBook /> },
  { label: "Trace", to: "/traces" },
  { label: "告警规则", to: "/alert-rules" },
  { label: "运维 Skills", to: "/skills" },
  { label: "任务历史", to: "/jobs" },
  { label: "故障处理", to: "/incidents" },
];

const meteringNavigation: readonly NavigationLeaf[] = [
  { label: "计量总览", to: "/metering", icon: <IconCalendarClock /> },
  { label: "租户用量排行", to: "/tenant-usage-ranking", icon: <IconUserGroup /> },
];

const auditNavigation: readonly NavigationLeaf[] = [
  { label: "集群审计", to: "/audit", icon: <IconSafe /> },
  { label: "API Key 审计", to: "/audit-api-keys", icon: <IconLock /> },
  { label: "推理调用审计", to: "/audit-inference", icon: <IconRobot /> },
  { label: "合规导出与取证", to: "/audit-export", icon: <IconExport /> },
];

const settingsNavigation: readonly NavigationLeaf[] = [
  {
    label: "平台管理员",
    to: "/platform-admins",
    icon: <IconUserGroup />,
  },
  {
    label: "平台角色",
    to: "/platform-roles",
    icon: <IconSafe />,
  },
  { label: "登录与 IdP（预留）", to: "/idp", icon: <IconLock /> },
  {
    label: "会话与安全策略（预留）",
    to: "/session",
    icon: <IconSafe />,
  },
];

const integrationNavigation: readonly NavigationLeaf[] = [
  { label: "运维 Webhook", to: "/webhook", icon: <IconLink /> },
  { label: "企业通知集成", to: "/notify", icon: <IconEmail /> },
  { label: "运营系统对接", to: "/ops-system", icon: <IconApps /> },
];

const visibleAppRoutes = new Set<AppRoute>([
  "/",
  "/tenants",
  "/tenants-quotas",
  "/tenants-admins",
  "/gpu",
  "/gpu-quotas",
  "/health",
  "/logs",
  "/metering",
  "/tenant-usage-ranking",
  "/audit",
  "/platform-admins",
  "/platform-roles",
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
  { label: "平台概览", to: "/", icon: <IconDashboard /> },
  {
    key: "infrastructure-operations",
    label: "资源池管理",
    icon: <IconCloud />,
    children: infrastructureNavigation,
  },
  {
    key: "tenant-management",
    label: "租户管理",
    icon: <IconUserGroup />,
    children: tenantNavigation,
  },
  {
    key: "operations-observability",
    label: "监控告警",
    icon: <IconTool />,
    children: observabilityNavigation,
  },
  {
    key: "platform-metering",
    label: "用量计量",
    icon: <IconCalendarClock />,
    children: meteringNavigation,
  },
  {
    key: "security-audit",
    label: "审计合规",
    icon: <IconSafe />,
    children: auditNavigation,
  },
  {
    key: "platform-settings",
    label: "系统设置",
    icon: <IconSettings />,
    children: settingsNavigation,
  },
  {
    key: "platform-integrations",
    label: "平台集成与通知",
    icon: <IconApps />,
    children: integrationNavigation,
  },
];

export const appNavigation: readonly NavigationItem[] =
  filterVisibleNavigation(completeAppNavigation);
