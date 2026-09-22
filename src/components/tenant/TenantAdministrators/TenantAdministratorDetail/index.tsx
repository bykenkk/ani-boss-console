import {
  Button,
  Descriptions,
  Dropdown,
  Menu,
  Modal,
  Result,
  Tag,
  Tooltip,
} from "@arco-design/web-react";
import { IconMoreVertical } from "@arco-design/web-react/icon";
import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { showMessage } from "@/lib/feedback";
import {
  DataTable,
  DetailPageFrame,
  type DetailInfoCard,
  type DetailTab,
  type ListColumn,
} from "@/components/common";
import { AdministratorPasswordModal } from "@/components/tenant/TenantAdministrators/AdministratorPasswordModal";
import { AdministratorRoleModal } from "@/components/tenant/TenantAdministrators/AdministratorRoleModal";
import type { TenantAdminAction } from "@/components/tenant/TenantManagementProvider";
import { useTenantManagement } from "@/components/tenant/TenantManagementProvider/useTenantManagement";
import { tenantAdminStatusMeta, type TenantAdminRole } from "@/components/tenant/model";
import { formatDate, formatDateTimeMinute } from "@/lib/date";

interface PermissionRow {
  resource: string;
  owner: string;
  administrator: string;
  auditor: string;
}

const permissionRows: PermissionRow[] = [
  { resource: "算力实例", owner: "管理", administrator: "管理", auditor: "查看" },
  { resource: "推理与模型", owner: "管理", administrator: "管理", auditor: "查看" },
  { resource: "成员邀请", owner: "允许", administrator: "允许", auditor: "不允许" },
  { resource: "计费信息", owner: "查看", administrator: "不允许", auditor: "查看" },
  { resource: "所有者移交", owner: "允许", administrator: "不允许", auditor: "不允许" },
];

const permissionColumns: ListColumn<PermissionRow>[] = [
  { title: "权限范围", dataIndex: "resource" },
  { title: "租户所有者", dataIndex: "owner" },
  { title: "租户管理员", dataIndex: "administrator" },
  { title: "只读审计", dataIndex: "auditor" },
];

interface TenantAdministratorDetailProps {
  adminId: string;
}

export function TenantAdministratorDetail({ adminId }: TenantAdministratorDetailProps) {
  const navigate = useNavigate();
  const { tenantAdmins, tenants, applyTenantAdminAction } = useTenantManagement();
  const admin = tenantAdmins.find((item) => item.id === adminId);
  const [roleVisible, setRoleVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState<TenantAdminRole>("租户管理员");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  const returnToList = () => {
    void navigate({ to: "/tenants-admins" });
  };

  if (!admin) {
    return (
      <Result
        status="404"
        title="租户管理员不存在"
        subTitle="该管理员可能已被移除，或当前地址无效。"
        extra={<Button onClick={returnToList}>返回租户管理员列表</Button>}
      />
    );
  }

  const tenant = tenants.find((item) => item.id === admin.tenantId);
  const status = tenantAdminStatusMeta[admin.status];

  const showResult = (result: { ok: boolean; reason?: string }, successMessage: string) => {
    if (result.ok) {
      showMessage({ type: "success", content: successMessage });
      return true;
    }
    showMessage({ type: "error", content: result.reason ?? "操作失败" });
    return false;
  };

  const confirmAction = (
    action: TenantAdminAction,
    title: string,
    content: string,
    successMessage: string,
    danger = false,
  ) => {
    Modal.confirm({
      title,
      content,
      okButtonProps: danger ? { status: "danger" } : undefined,
      onOk: () => {
        showResult(applyTenantAdminAction(admin.id, action), successMessage);
      },
    });
  };

  const confirmRoleChange = () => {
    if (
      showResult(
        applyTenantAdminAction(admin.id, "change_role", {
          role: selectedRole,
        }),
        "管理员角色已更新",
      )
    ) {
      setRoleVisible(false);
    }
  };

  const confirmPasswordReset = () => {
    if (
      showResult(
        applyTenantAdminAction(admin.id, "reset_password", {
          password: newPassword,
        }),
        "管理员密码已重置",
      )
    ) {
      setPasswordVisible(false);
      setNewPassword("");
    }
  };

  const moreMenu = (
    <Menu>
      {admin.status === "invited" ? (
        <>
          <Menu.Item
            key="resend-invite"
            onClick={() =>
              confirmAction(
                "resend_invite",
                "重发邀请",
                `确认向 ${admin.email} 重新发送邀请？`,
                "邀请已重新发送",
              )
            }
          >
            重发邀请
          </Menu.Item>
          <Menu.Item
            key="accept-invite"
            onClick={() =>
              confirmAction(
                "accept_invite",
                "模拟接受邀请",
                `确认模拟 ${admin.email} 接受邀请？`,
                "邀请已接受，管理员已激活",
              )
            }
          >
            模拟接受
          </Menu.Item>
        </>
      ) : null}
      <Menu.Item
        key="role"
        onClick={() => {
          setSelectedRole(admin.role);
          setRoleVisible(true);
        }}
      >
        改角色
      </Menu.Item>
      {admin.status === "active" ? (
        <>
          <Menu.Item
            key="password"
            onClick={() => {
              setNewPassword("");
              setPasswordVisible(true);
            }}
          >
            重置密码
          </Menu.Item>
          {admin.role !== "租户所有者" ? (
            <Menu.Item
              key="transfer"
              onClick={() =>
                confirmAction(
                  "transfer_owner",
                  "移交所有者",
                  `确认将 ${admin.email} 设为租户所有者？`,
                  "租户所有者已移交",
                )
              }
            >
              移交所有者
            </Menu.Item>
          ) : null}
          <Menu.Item
            key="impersonate"
            onClick={() =>
              confirmAction(
                "impersonate",
                "运维模拟登录",
                `确认以 ${admin.email} 的身份进入租户 Console？`,
                "模拟登录会话已创建",
              )
            }
          >
            模拟登录
          </Menu.Item>
        </>
      ) : null}
      {admin.status === "disabled" ? (
        <Menu.Item
          key="enable"
          onClick={() =>
            confirmAction("enable", "启用管理员", `确认启用 ${admin.email}？`, "管理员已启用")
          }
        >
          启用
        </Menu.Item>
      ) : (
        <Menu.Item
          key="disable"
          onClick={() =>
            confirmAction(
              "disable",
              "禁用管理员",
              `确认禁用 ${admin.email}？`,
              "管理员已禁用",
              true,
            )
          }
        >
          禁用
        </Menu.Item>
      )}
    </Menu>
  );

  const infoCards: DetailInfoCard[] = [
    {
      key: "overview",
      title: "管理员概览",
      content: (
        <Descriptions
          column={1}
          data={[
            { label: "用户 ID", value: admin.id },
            { label: "用户名", value: admin.name },
            { label: "显示名", value: admin.displayName || "-" },
            { label: "邮箱", value: admin.email },
            {
              label: "所属租户",
              value: tenant ? (
                <Link to="/tenants/$tenantId" params={{ tenantId: tenant.id }}>
                  {tenant.name}
                </Link>
              ) : (
                admin.tenantName
              ),
            },
            { label: "角色", value: admin.role },
            {
              label: "状态",
              value: <Tag color={status.color}>{status.label}</Tag>,
            },
            { label: "来源", value: admin.source },
            { label: "MFA", value: admin.mfa ? "已开启" : "未开启" },
            { label: "邀请时间", value: formatDate(admin.invitedAt) },
            { label: "最近登录", value: formatDateTimeMinute(admin.lastLogin) },
            { label: "最近重置密码", value: formatDateTimeMinute(admin.lastResetAt) },
          ]}
        />
      ),
    },
  ];

  const operationRows = [
    ...(admin.lastResetAt
      ? [
          {
            id: "password-reset",
            action: "重置密码",
            result: "成功",
            operator: "platform-ops",
            time: formatDateTimeMinute(admin.lastResetAt),
          },
        ]
      : []),
    ...(admin.status === "active" && admin.lastLogin !== "-"
      ? [
          {
            id: "last-login",
            action: "管理员登录",
            result: "成功",
            operator: admin.email,
            time: formatDateTimeMinute(admin.lastLogin),
          },
        ]
      : []),
    {
      id: "invited",
      action: "发送邀请",
      result: "成功",
      operator: "platform-admin",
      time: formatDate(admin.invitedAt),
    },
  ];

  const detailTabs: DetailTab[] = [
    {
      key: "permissions",
      title: "权限",
      content: (
        <div className="py-4">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="text-sm text-gray-500">
              当前角色：<Tag color="blue">{admin.role}</Tag>
            </div>
            <Button
              onClick={() => {
                setSelectedRole(admin.role);
                setRoleVisible(true);
              }}
            >
              修改角色
            </Button>
          </div>
          <DataTable
            rowKey="resource"
            columns={permissionColumns}
            data={permissionRows}
            pagination={false}
          />
        </div>
      ),
    },
    {
      key: "operations",
      title: "操作记录",
      content: (
        <div className="py-4">
          <DataTable
            rowKey="id"
            pagination={false}
            columns={[
              { title: "操作", dataIndex: "action" },
              { title: "结果", dataIndex: "result", width: 100 },
              { title: "操作者", dataIndex: "operator", width: 180 },
              { title: "时间", dataIndex: "time", width: 170 },
            ]}
            data={operationRows}
          />
        </div>
      ),
    },
  ];

  return (
    <>
      <DetailPageFrame
        breadcrumbs={[
          { label: "租户管理" },
          { label: "租户管理员", onClick: returnToList },
          { label: admin.name },
        ]}
        title={admin.displayName || admin.name}
        subtitle={admin.email}
        status={<Tag color={status.color}>{status.label}</Tag>}
        headerItems={[
          { label: "所属租户", value: admin.tenantName },
          { label: "角色", value: admin.role },
          { label: "MFA", value: admin.mfa ? "已开启" : "未开启" },
          { label: "最近登录", value: formatDateTimeMinute(admin.lastLogin) },
        ]}
        actions={
          <Tooltip content="更多操作">
            <Dropdown trigger="click" position="br" droplist={moreMenu}>
              <Button icon={<IconMoreVertical />} aria-label="更多操作" />
            </Dropdown>
          </Tooltip>
        }
        cards={infoCards}
        tabs={detailTabs}
        defaultTabKey="permissions"
        onBack={returnToList}
      />

      <AdministratorRoleModal
        admin={roleVisible ? admin : undefined}
        role={selectedRole}
        onRoleChange={setSelectedRole}
        onConfirm={confirmRoleChange}
        onCancel={() => setRoleVisible(false)}
      />
      <AdministratorPasswordModal
        admin={passwordVisible ? admin : undefined}
        password={newPassword}
        onPasswordChange={setNewPassword}
        onConfirm={confirmPasswordReset}
        onCancel={() => setPasswordVisible(false)}
      />
    </>
  );
}
