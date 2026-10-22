import { useCursorPagination } from "@/hooks/useCursorPagination";
import { fetchTenantAuditLogs, tenantManagementQueryKeys } from "@/api/tenant";
import { DataTable, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";

import { useQuery } from "@tanstack/react-query";

interface TenantAuditRecordsProps {
  tenantId: string;
}

const tenantAuditActionLabels: Record<string, string> = {
  "tenant.bind_plan_quota": "绑定配额策略",
  "tenant.create": "创建租户",
  "tenant.disable": "禁用租户",
  "tenant.freeze": "冻结租户",
  "tenant.mfa.update": "更新 MFA 设置",
  "tenant.quota_change_request.apply_failed": "应用配额调整失败",
  "tenant.quota_change_request.apply_retry": "重试应用配额调整",
  "tenant.quota_change_request.approve": "通过配额调整",
  "tenant.quota_change_request.reject": "驳回配额调整",
  "tenant.quota_change_request.review": "处理配额调整",
  "tenant.quota_change_request.submit": "提交配额调整",
  "tenant.quota_init_failed": "初始化租户配额失败",
  "tenant.sso.update": "更新 SSO 配置",
  "tenant.unfreeze": "解冻租户",
  "tenant.update": "更新租户信息",
  "tenant_admin.change_role": "调整租户管理员角色",
  "tenant_admin.delete": "删除租户管理员",
  "tenant_admin.disable": "禁用租户管理员",
  "tenant_admin.enable": "启用租户管理员",
  "tenant_admin.invite": "邀请租户管理员",
  "tenant_admin.resend_invitation": "重发租户管理员邀请",
  "tenant_admin.reset_password": "重置租户管理员密码",
  "tenant_plan.activate": "发布配额策略",
  "tenant_plan.create": "创建配额策略",
  "tenant_plan.delete": "删除配额策略",
  "tenant_plan.disable": "停用配额策略",
  "tenant_plan.update": "更新配额策略",
  "tenant_plan.update_quota_limits": "更新配额策略上限",
};

export function TenantAuditRecords({ tenantId }: TenantAuditRecordsProps) {
  const cursor = useCursorPagination(tenantId);
  const pageParams = { cursor: cursor.cursor, limit: cursor.limit };
  const auditQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-audit", tenantId),
        action: "租户审计记录加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: [...tenantManagementQueryKeys.tenantAudit(tenantId), pageParams],
    queryFn: ({ signal }) => fetchTenantAuditLogs(tenantId, pageParams, signal),
  });

  return (
    <DataTable
      rowKey="id"
      columns={[
        {
          title: "动作",
          dataIndex: "action",
          width: 150,
          fixed: "left",
          ellipsis: true,
          render: (value: string) => tenantAuditActionLabels[value] ?? value,
        },
        {
          title: "资源",
          dataIndex: "resource",
          width: 100,
          ellipsis: true,
        },
        {
          title: "结果",
          width: 80,
          render: (_, item) => (
            <StatusBadge
              tone={item.result === "success" ? "success" : "danger"}
              value={item.result === "success" ? "成功" : "失败"}
            />
          ),
        },
        {
          title: "操作人",
          dataIndex: "userId",
          width: 180,
          ellipsis: true,
        },
        {
          title: "时间",
          dataIndex: "createdAt",
          width: 180,
          render: (value: string) => formatDateTime(value),
        },
      ]}
      data={auditQuery.data?.items ?? []}
      loading={auditQuery.isPending}
      pagination={cursor.getPagination(
        auditQuery.data?.next_cursor ?? undefined,
        auditQuery.isFetching,
      )}
      scroll={{ x: 900 }}
      noDataElement={<div className="py-8 text-center text-gray-500">暂无审计记录</div>}
    />
  );
}
