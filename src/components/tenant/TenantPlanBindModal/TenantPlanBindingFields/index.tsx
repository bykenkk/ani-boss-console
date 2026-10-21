import { Form, Select } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { fetchTenantPlanBindableTenants, tenantManagementQueryKeys } from "@/api/tenant";
import { withId } from "@/lib/id";
interface TenantPlanBindingFieldsProps {
  planId: string;
}
export function TenantPlanBindingFields({ planId }: TenantPlanBindingFieldsProps) {
  const tenants = useQuery({
    queryKey: tenantManagementQueryKeys.planBindableTenants(planId),
    queryFn: () => fetchTenantPlanBindableTenants(planId),
    meta: {
      errorNotification: {
        id: withId("tenant-plan-bindable", planId),
        action: "可绑定租户加载",
        fallback: "请求失败，请稍后重试",
      },
    },
  });
  return (
    <Form.Item
      field="tenantId"
      label="目标租户"
      rules={[{ required: true, message: "请选择租户" }]}
    >
      <Select
        loading={tenants.isPending}
        placeholder={tenants.data?.length ? "请选择租户" : "暂无可绑定租户"}
        options={(tenants.data ?? []).map((tenant) => ({
          label: tenant.displayName + " · " + tenant.name,
          value: tenant.id,
        }))}
      />
    </Form.Item>
  );
}
