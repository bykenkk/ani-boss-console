import { getAccessTokenRoles } from "@/stores/auth";
import { useAuthState } from "./useAuthState";

export function useTenantManagementAccess() {
  const authState = useAuthState();
  const roles = getAccessTokenRoles(authState.tokens?.access_token);
  return {
    canManage:
      authState.developmentBypass ||
      roles.includes("platform-admin") ||
      roles.includes("platform-ops"),
  };
}
