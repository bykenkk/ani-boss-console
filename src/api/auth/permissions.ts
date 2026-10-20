import { adminRequest } from "@/api/request";

export function fetchPermissionCodes(
  signal?: AbortSignal,
): Promise<{ codes?: string[]; hiddenFields?: string[] }> {
  return adminRequest("/perm-codes", { signal });
}
