import type { ReactNode } from "react";

export type AppRoute =
  | "/notification-channels"
  | "/tenant-plans"
  | "/permissions"
  | "/permission-groups"
  | "/apis"
  | "/"
  | "/overview-inference"
  | "/overview-kb"
  | "/overview-alerts"
  | "/tenants"
  | "/tenants-admins"
  | "/tenants-billing"
  | "/pool"
  | "/gpu-clusters"
  | "/gpu"
  | "/compute-presets"
  | "/gpu-quotas"
  | "/nodes"
  | "/storage"
  | "/storage-quotas"
  | "/network"
  | "/virtual-switches"
  | "/layer2-networks"
  | "/public-networks"
  | "/registry-quota"
  | "/registry-vulnerabilities"
  | "/registry-gc"
  | "/health"
  | "/health-gpu"
  | "/health-inference"
  | "/health-kb"
  | "/metrics"
  | "/logs"
  | "/traces"
  | "/alert-rules"
  | "/skills"
  | "/jobs"
  | "/incidents"
  | "/metering"
  | "/tenant-usage-ranking"
  | "/audit-login"
  | "/audit-api"
  | "/audit-operation"
  | "/audit-api-keys"
  | "/audit-inference"
  | "/audit-export"
  | "/platform-admins"
  | "/platform-roles"
  | "/idp"
  | "/session"
  | "/webhook"
  | "/notify"
  | "/ops-system";

export interface AppBreadcrumbItem {
  label: ReactNode;
  to?: AppRoute;
  onClick?: () => void;
}

export interface AppBreadcrumbNavigation {
  items: AppBreadcrumbItem[];
  onBack?: () => void;
}
