import type { ReactNode } from "react";

export type AppRoute =
  | "/"
  | "/overview-inference"
  | "/overview-kb"
  | "/overview-alerts"
  | "/tenants"
  | "/tenants-quotas"
  | "/tenants-admins"
  | "/tenants-billing"
  | "/pool"
  | "/gpu"
  | "/gpu-quotas"
  | "/nodes"
  | "/storage"
  | "/storage-quotas"
  | "/network"
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
  | "/audit"
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
