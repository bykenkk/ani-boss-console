import { Tag, Typography } from "@arco-design/web-react";
import { DataTable } from "@/components/common";
import type { Tenant, TenantOperationStatus } from "@/components/tenant/model";
import { formatDateTimeMinute } from "@/lib/date";

interface TenantOperationHistoryProps {
  tenant: Tenant;
}

const operationLabels: Record<string, string> = {
  create: "开通租户",
  update_profile: "更新租户资料",
  suspend: "冻结租户",
  resume: "解冻租户",
  disable: "禁用租户",
  rebind_quota: "改绑配额策略",
  submit_quota_request: "提交配额申请",
  approve_quota_request: "通过配额申请",
  reject_quota_request: "驳回配额申请",
  refresh_usage: "刷新用量",
  invite_admin: "邀请管理员",
  extend_trial: "试用延期",
  convert_trial: "试用转正式",
  simulate_trial_expiry: "模拟试用到期",
  update_arrears_policy: "更新欠费策略",
  simulate_overdue: "模拟欠费",
};

const statusMeta: Record<TenantOperationStatus, { label: string; color: string }> = {
  success: { label: "成功", color: "green" },
  failed: { label: "失败", color: "red" },
};

export function TenantOperationHistory({ tenant }: TenantOperationHistoryProps) {
  return (
    <DataTable
      rowKey="id"
      data={tenant.operations}
      pagination={false}
      columns={[
        {
          title: "操作",
          dataIndex: "operation",
          width: 180,
          render: (value: string) => operationLabels[value] ?? value,
        },
        {
          title: "状态",
          dataIndex: "status",
          width: 100,
          render: (value: TenantOperationStatus) => (
            <Tag color={statusMeta[value].color}>{statusMeta[value].label}</Tag>
          ),
        },
        {
          title: "说明",
          dataIndex: "message",
          render: (value: string) => value || "-",
        },
        {
          title: "操作人",
          dataIndex: "by",
          width: 180,
          render: (value: string) => <Typography.Text copyable>{value}</Typography.Text>,
        },
        {
          title: "时间",
          dataIndex: "createdAt",
          width: 180,
          render: (value: string) => formatDateTimeMinute(value),
        },
      ]}
    />
  );
}
