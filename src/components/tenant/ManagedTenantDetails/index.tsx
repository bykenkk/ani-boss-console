import { Alert, Descriptions, Space, Button } from "@arco-design/web-react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getManagement, getManagedTenantUsage, managementKeys } from "@/api/management";
import { DataTable } from "@/components/common";
import { withId } from "@/lib/id";
import { formatDateTime } from "@/lib/date";
export function ManagedTenantDetails({ tenantId }: { tenantId: number }) {
  const detail = useQuery({
    queryKey: managementKeys.detail("tenants", tenantId),
    queryFn: ({ signal }) => getManagement("tenants", tenantId, signal),
    meta: {
      errorNotification: { id: withId("management-tenant", tenantId), action: "租户详情加载" },
    },
  });
  const usage = useQuery({
    queryKey: ["management", "tenant-usage", tenantId],
    queryFn: ({ signal }) => getManagedTenantUsage(tenantId, signal),
    meta: {
      errorNotification: {
        id: withId("management-tenant-usage", tenantId),
        action: "租户用量加载",
      },
    },
  });
  const tenant = detail.data;
  return (
    <Space direction="vertical" className="w-full" size="large">
      <Descriptions
        column={2}
        data={[
          { label: "租户名称", value: tenant?.name ?? "-" },
          { label: "编码", value: tenant?.code ?? "-" },
          { label: "当前用户数", value: usage.data?.userCount ?? "-" },
          { label: "存储用量（字节）", value: usage.data?.storageUsedBytes ?? "-" },
          { label: "API 调用次数", value: usage.data?.apiCallCount ?? "-" },
          { label: "管理员", value: tenant?.adminUserName ?? "-" },
          { label: "套餐 ID", value: tenant?.planId ?? "-" },
          { label: "专属域名", value: tenant?.domain ?? "-" },
          { label: "到期时间", value: formatDateTime(tenant?.expiredAt) },
        ]}
      />
      <DataTable
        header={{ title: "租户配额用量" }}
        rowKey="quotaCode"
        data={usage.data?.quotas ?? []}
        loading={usage.isPending}
        pagination={false}
        columns={[
          { key: "quotaCode", dataIndex: "quotaCode", title: "配额编码", width: 240 },
          { key: "quotaValue", dataIndex: "quotaValue", title: "上限", width: 160 },
        ]}
      />
      <Alert content="配额策略与计费业务入口继续保留；未建立新旧租户对应关系前，请在业务页面独立选择租户。" />
      <Space>
        <Link to="/tenants-quotas">
          <Button>配额策略</Button>
        </Link>
        <Link to="/tenants-billing">
          <Button>计费与用量</Button>
        </Link>
      </Space>
    </Space>
  );
}
