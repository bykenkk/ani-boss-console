import { Empty, Spin } from "@arco-design/web-react";
import type { PlatformAdministratorAuditLog } from "@/api/platform-admins";
import { DataTable, type ListColumn, StatusBadge } from "@/components/common";
import { formatDateTime } from "@/lib/date";

const actionLabels: Record<string, string> = {
  "platform_admin.create": "创建平台管理员",
  "platform_admin.change_role": "修改角色",
  "platform_admin.reset_password": "重置密码",
  "platform_admin.disable": "禁用账号",
  "platform_admin.enable": "启用账号",
  "platform_admin.delete": "删除账号",
};

const columns: ListColumn<PlatformAdministratorAuditLog>[] = [
  {
    title: "操作",
    dataIndex: "action",
    width: 180,
    render: (value) => actionLabels[value] ?? value,
  },
  { title: "资源", dataIndex: "resource", render: (value) => value || "-" },
  {
    title: "结果",
    dataIndex: "result",
    width: 120,
    render: (value) => (
      <StatusBadge
        tone={value === "success" ? "success" : "danger"}
        value={value === "success" ? "成功" : "失败"}
      />
    ),
  },
  {
    title: "时间",
    dataIndex: "createdAt",
    width: 180,
    render: (value) => formatDateTime(value),
  },
];

export function OperationRecords({
  records,
  loading,
}: {
  records: PlatformAdministratorAuditLog[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Spin />
      </div>
    );
  }

  if (!records.length) return <Empty description="暂无操作记录" />;

  return (
    <DataTable
      rowKey="id"
      columns={columns}
      data={records}
      pagination={false}
      scroll={{ x: 760 }}
    />
  );
}
