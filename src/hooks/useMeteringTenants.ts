import { useQuery } from "@tanstack/react-query";
import { fetchTenants, tenantManagementQueryKeys } from "@/api/tenant";

export function useMeteringTenants() {
  return useQuery({
    queryKey: [...tenantManagementQueryKeys.tenantList(), "options", { limit: 100 }],
    // TODO(options-pagination): 租户名称暂取 ANI 首 100 项；服务端支持按计量租户 ID 查询后替换，未加载名称的记录继续展示 ID。
    queryFn: ({ signal }) => fetchTenants({}, { limit: 100 }, signal),
    select: (response) => response.items,
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
