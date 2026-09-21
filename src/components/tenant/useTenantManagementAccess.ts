import { getAccessTokenRoles, useAuthState } from "@/components/auth/store";

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
