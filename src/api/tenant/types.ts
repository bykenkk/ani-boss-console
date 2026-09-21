export type TenantStatus = "active" | "frozen" | "disabled";
export type TenantPlanStatus = "draft" | "active" | "disabled";
export type TenantAdministratorStatus = "active" | "disabled";
export type TenantAdministratorSource = "local" | "third_party";
export type TenantAdministratorRole = "tenant-admin" | "user" | "auditor";
export type QuotaChangeRequestStatus = "pending" | "approved" | "rejected";

export interface TenantListItem {
  id: string;
  name: string;
  displayName: string;
  planId: string;
  planCode: string;
  status: TenantStatus;
  administratorCount: number;
  createdAt: string;
}

export interface TenantDetail extends TenantListItem {
  contactEmail: string | null;
  userCount: number;
  frozenAt: string | null;
  disabledAt: string | null;
  ssoEnabled: boolean;
  mfaRequired: boolean;
  updatedAt: string;
}

export interface TenantListFilters {
  status?: TenantStatus;
  search?: string;
}

export interface AvailableTenantPlan {
  id: string;
  code: string;
  name: string;
}

export interface CreateTenantInput {
  name: string;
  displayName: string;
  contactEmail: string;
  planId: string;
  administratorEmail: string;
  administratorName: string;
  administratorPassword: string;
}

export interface UpdateTenantInput {
  tenantId: string;
  displayName?: string;
  contactEmail?: string;
}

export interface TenantAuthConfig {
  ssoEnabled: boolean;
  provider: string | null;
  mfaRequired: boolean;
  updatedAt: string;
}

export interface UpdateTenantSsoInput {
  tenantId: string;
  ssoEnabled: boolean;
  provider?: string;
}

export interface TenantSsoTestResult {
  success: boolean;
  discoveryResult: Record<string, unknown> | null;
  error: string | null;
  testedAt: string;
}

export interface TenantQuotaItem {
  resourceType: string;
  displayName: string;
  used: number;
  total: number;
  unit: string;
}

export interface TenantQuotaChangeRequest {
  requestId: string;
  tenantId: string;
  resourceType: string;
  oldValue: number;
  newValue: number;
  status: QuotaChangeRequestStatus;
  requestedBy: string;
  createdAt: string;
}

export interface SubmitTenantQuotaChangeInput {
  tenantId: string;
  items: Array<{ resourceType: string; newValue: number }>;
}

export interface ReviewTenantQuotaChangeInput {
  tenantId: string;
  requestId: string;
  approved: boolean;
}

export interface TenantLifecycleEntry {
  id: string;
  action: "create" | "freeze" | "unfreeze" | "disable";
  reason: string | null;
  userId: string | null;
  requestId: string | null;
  createdAt: string;
}

export interface TenantAuditLogEntry {
  id: string;
  action: string;
  resource: string;
  result: "success" | "failure";
  userId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface TenantPlanListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: TenantPlanStatus;
  tenantCount: number;
  createdAt: string;
  updatedAt: string;
}

export type TenantPlanDetail = TenantPlanListItem;

export interface TenantPlanListFilters {
  status?: TenantPlanStatus;
  search?: string;
}

export interface TenantQuotaMetaItem {
  resourceType: string;
  displayName: string;
  unit: string;
  defaultQuota: number;
  isDiscrete: boolean;
}

export interface TenantPlanQuotaLimit {
  resourceType: string;
  displayName: string;
  unit: string;
  total: number;
}

export interface CreateTenantPlanInput {
  code: string;
  name: string;
  description: string;
  quotaLimits: Array<{ resourceType: string; total: number | null }>;
}

export interface UpdateTenantPlanInput {
  planId: string;
  name?: string;
  description?: string;
}

export interface UpdateTenantPlanLimitsInput {
  planId: string;
  items: Array<{ resourceType: string; total: number | null }>;
}

export interface BoundTenant {
  id: string;
  name: string;
  displayName: string;
  status: TenantStatus;
}

export interface TenantPlanAuditLog {
  id: string;
  action: string;
  result: "success" | "failure";
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface TenantReference {
  id: string;
  name: string;
  displayName: string | null;
  status?: Exclude<TenantStatus, "disabled">;
}

export interface TenantAdministratorListItem {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
  role: TenantAdministratorRole;
  status: TenantAdministratorStatus;
  isInviting: boolean;
  isExpired: boolean;
  source: TenantAdministratorSource;
  lastLoginAt: string | null;
  tenant: TenantReference;
}

export interface TenantAdministratorDetail extends TenantAdministratorListItem {
  createdAt: string | null;
  updatedAt: string | null;
}

export interface TenantAdministratorListFilters {
  tenantId?: string;
  status?: TenantAdministratorStatus;
  isInviting?: boolean;
  isExpired?: boolean;
  search?: string;
  role?: TenantAdministratorRole;
  source?: TenantAdministratorSource;
}

export interface TenantRoleDefinition {
  id: string;
  tenantId: string | null;
  name: TenantAdministratorRole;
  permissions: Array<Record<string, unknown>>;
}

export interface InviteTenantAdministratorInput {
  tenantId: string;
  email: string;
  username: string;
}

export interface UpdateTenantAdministratorRoleInput {
  tenantId: string;
  userId: string;
  roleId: string;
}

export interface ResetTenantAdministratorPasswordInput {
  tenantId: string;
  userId: string;
  newPassword: string;
}

export interface TenantAdministratorAuditLog {
  id: string;
  action: string;
  resource: string;
  result: "success" | "failure";
  userId: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

export interface TenantMutationResult {
  id: string;
  message: string;
}

export interface TenantInvitationResult extends TenantMutationResult {
  token: string;
  expireAt: string;
}
