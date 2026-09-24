import { useQuery } from "@tanstack/react-query";
import { fetchTenants, tenantManagementQueryKeys } from "@/api/tenant";

export function useMeteringTenants() {
  return useQuery({
    queryKey: tenantManagementQueryKeys.tenantList(),
    queryFn: () => fetchTenants(),
    staleTime: 60_000,
    meta: {
      errorNotification: {
        id: "metering-tenant-names",
        action: "租户名称加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
}
