import { Descriptions } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getManagement, managementKeys } from "@/api/management";
import { getPlan, planKeys } from "@/api/plans";
import {
  DetailPageFrame,
  ConfiguredDataTableRowActions,
  ResourceIdentity,
  StatusBadge,
  type DetailTab,
} from "@/components/common";
import { ManagedTenantImages } from "@/components/container-images/ManagedTenantImages";
import { TenantUsageSummary } from "@/components/tenant/TenantUsageSummary";
import { TenantQuotaAccounts } from "@/components/tenant/TenantQuotaAccounts";
import { TenantEditModal } from "@/components/tenant/TenantEditModal";
import { useTenantActions } from "@/hooks/useTenantActions";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";

interface TenantDetailPageProps {
  tenantId: number;
  onBack: () => void | Promise<void>;
}
const statusLabels: Record<string, string> = {
  ON: "启用",
  OFF: "禁用",
  EXPIRED: "过期",
  FREEZE: "冻结",
};
const typeLabels: Record<string, string> = {
  TENANT_TYPE_UNSPECIFIED: "未指定",
  TRIAL: "试用",
  PAID: "付费",
  INTERNAL: "内部",
  PARTNER: "合作伙伴",
  CUSTOM: "定制",
};

export function TenantDetailPage({ tenantId, onBack }: TenantDetailPageProps) {
  const [editing, setEditing] = useState(false);
  const { actions } = useTenantActions({
    onEdit: () => setEditing(true),
    onDeleted: () => onBack(),
  });
  const query = useQuery({
    queryKey: managementKeys.detail("tenants", tenantId),
    queryFn: ({ signal }) => getManagement("tenants", tenantId, signal),
    meta: {
      errorNotification: {
        id: withId("management-detail", "tenants", tenantId),
        action: "租户详情加载",
      },
    },
  });
  const tenant = query.data;
  const planId = tenant?.planId;
  const plan = useQuery({
    queryKey: planKeys.detail(planId ?? 0),
    queryFn: ({ signal }) => getPlan(planId!, signal),
    enabled: !!planId,
    meta: {
      errorNotification: {
        id: withId("management-detail", "plans", planId),
        action: "订阅套餐加载",
      },
    },
  });
  const tabs: DetailTab[] = tenant
    ? [
        {
          key: "usage",
          title: "套餐配额",
          content: <TenantUsageSummary tenantId={tenantId} />,
          destroyOnHide: true,
        },
        {
          key: "accounts",
          title: "资源配额",
          content: <TenantQuotaAccounts tenantId={tenantId} />,
          destroyOnHide: true,
        },
        // 离开此页签即卸载代管组件，取消请求并清除一次性密钥。
        {
          key: "images",
          title: "容器镜像",
          content: <ManagedTenantImages key={tenantId} tenantId={tenantId} />,
          destroyOnHide: true,
        },
      ]
    : [];
  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "租户列表", onClick: onBack },
          { label: tenant?.name ?? String(tenantId) },
        ]}
        title={tenant?.name ?? "租户详情"}
        status={
          tenant?.status ? (
            <StatusBadge
              value={statusLabels[tenant.status] ?? tenant.status}
              tone={tenant.status === "ON" ? "success" : "default"}
            />
          ) : undefined
        }
        loading={query.isPending}
        headerItems={[]}
        actions={
          tenant ? <ConfiguredDataTableRowActions actions={actions} record={tenant} /> : undefined
        }
        cards={[
          {
            key: "tenant",
            title: "基本信息",
            content: (
              <Descriptions
                column={1}
                valueStyle={{ wordBreak: "break-all" }}
                data={[
                  { label: "租户编号", value: tenant?.code ?? "-" },
                  {
                    label: "租户类型",
                    value: tenant?.type ? (typeLabels[tenant.type] ?? tenant.type) : "-",
                  },
                  {
                    label: "订阅套餐",
                    value: (
                      <ResourceIdentity
                        name={plan.data?.name ?? (planId ? `套餐 ID：${planId}` : undefined)}
                        display="name"
                      />
                    ),
                  },
                  { label: "成员数", value: tenant?.memberCount ?? "-" },
                  { label: "创建时间", value: formatDateTime(tenant?.createdAt) },
                ]}
              />
            ),
          },
        ]}
        tabs={tabs}
        defaultTabKey="usage"
        onBack={onBack}
      />
      {editing && tenant && (
        <TenantEditModal
          record={tenant}
          onCancel={() => setEditing(false)}
          onSuccess={() => setEditing(false)}
        />
      )}
    </>
  );
}
