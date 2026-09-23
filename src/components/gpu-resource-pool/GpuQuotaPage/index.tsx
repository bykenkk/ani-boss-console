import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchTenantGpuAllocations,
  gpuResourcePoolQueryKeys,
  type TenantGpuAllocation,
} from "@/api/gpu-inventory";
import { ListPageFrame } from "@/components/common";
import { EditGpuQuotaModal } from "../EditGpuQuotaModal";
import { EditGpuReservationModal } from "../EditGpuReservationModal";
import { TenantGpuAllocationTable } from "../TenantGpuAllocationTable";

export function GpuQuotaPage() {
  const [keyword, setKeyword] = useState("");
  const [quotaTarget, setQuotaTarget] = useState<TenantGpuAllocation | null>(null);
  const [reservationTarget, setReservationTarget] = useState<TenantGpuAllocation | null>(null);
  const tenantsQuery = useQuery({
    meta: {
      errorNotification: {
        id: "tenant-gpu-allocations",
        action: "租户 GPU 台账加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: gpuResourcePoolQueryKeys.tenants,
    queryFn: fetchTenantGpuAllocations,
  });

  const tenants = tenantsQuery.data || [];
  const query = keyword.trim().toLowerCase();
  const filteredTenants = query
    ? tenants.filter((tenant) =>
        `${tenant.tenantName} ${tenant.tenantId}`.toLowerCase().includes(query),
      )
    : tenants;

  return (
    <>
      <ListPageFrame
        header={{
          title: "GPU配额",
          subtitle: "按租户查看 GPU 资源配额上限、预留与可用量。",
          actions: [
            {
              key: "refresh",
              label: "刷新",
              variant: "secondary",
              disabled: tenantsQuery.isFetching,
              onClick: () => void tenantsQuery.refetch(),
            },
          ],
        }}
        toolbar={{
          search: {
            fields: [{ value: "tenant", label: "租户" }],
            field: "tenant",
            value: keyword,
            placeholder: "搜索租户名称或 ID",
            onFieldChange: () => undefined,
            onChange: setKeyword,
          },
        }}
      >
        <TenantGpuAllocationTable
          data={filteredTenants}
          loading={tenantsQuery.isPending}
          emptyText={keyword.trim() ? "没有符合搜索条件的租户" : undefined}
          onEditQuota={setQuotaTarget}
          onEditReservation={setReservationTarget}
        />
      </ListPageFrame>

      {quotaTarget ? (
        <EditGpuQuotaModal
          tenant={quotaTarget}
          onCancel={() => setQuotaTarget(null)}
          onSuccess={() => setQuotaTarget(null)}
        />
      ) : null}
      {reservationTarget ? (
        <EditGpuReservationModal
          tenant={reservationTarget}
          onCancel={() => setReservationTarget(null)}
          onSuccess={() => setReservationTarget(null)}
        />
      ) : null}
    </>
  );
}
