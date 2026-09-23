import { formatCurrentDateTime, getCurrentTimestamp } from "@/lib/date";
import type {
  Tenant,
  TenantBillingOperation,
  TenantLifecycleEvent,
  TenantOperation,
} from "@/components/tenant/model";

export function createBillingOperation(
  operation: string,
  message: string,
  by = "platform-admin",
): TenantBillingOperation {
  const createdAt = formatCurrentDateTime();
  return {
    id: `billing-operation-${getCurrentTimestamp()}-${Math.random().toString(36).slice(2, 7)}`,
    operation,
    message,
    createdAt,
    by,
  };
}

export function createLifecycleEvent(
  event: TenantLifecycleEvent["event"],
  message: string,
  by = "platform-admin",
): TenantLifecycleEvent {
  return {
    id: `lifecycle-${getCurrentTimestamp()}-${Math.random().toString(36).slice(2, 6)}`,
    at: formatCurrentDateTime(),
    event,
    by,
    message,
  };
}

export function appendTenantOperation(
  tenant: Tenant,
  operation: string,
  message: string,
  by = "platform-admin",
): Tenant {
  const operationRecord: TenantOperation = {
    id: `operation-${getCurrentTimestamp()}-${Math.random().toString(36).slice(2, 6)}`,
    operation,
    status: "success",
    message,
    createdAt: formatCurrentDateTime(),
    by,
  };

  return {
    ...tenant,
    operations: [operationRecord, ...tenant.operations].slice(0, 40),
  };
}
