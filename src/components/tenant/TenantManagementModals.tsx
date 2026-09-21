import { Form, Input, InputNumber, Modal, Select } from "@arco-design/web-react";
import { useState } from "react";
import type {
  BoundTenant,
  CreateTenantPlanInput,
  InviteTenantAdministratorInput,
  TenantPlanDetail,
  TenantPlanQuotaLimit,
  TenantQuotaItem,
  TenantQuotaMetaItem,
  TenantRoleDefinition,
  UpdateTenantInput,
} from "@/api/tenant";
import { tenantAdministratorRoleLabels } from "./apiModel";
import { showMessage } from "@/lib/feedback";

interface LoadingModalProps {
  loading: boolean;
  onCancel: () => void;
}

export function TenantProfileModal({
  tenantId,
  displayName,
  contactEmail,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  tenantId: string;
  displayName: string;
  contactEmail: string | null;
  onSubmit: (input: UpdateTenantInput) => void;
}) {
  const [draft, setDraft] = useState({ displayName, contactEmail: contactEmail ?? "" });

  const submit = () => {
    if (!draft.displayName.trim()) {
      showMessage({ type: "warning", content: "请填写租户显示名" });
      return;
    }
    if (draft.contactEmail && !draft.contactEmail.includes("@")) {
      showMessage({ type: "warning", content: "请输入有效的联系邮箱" });
      return;
    }
    onSubmit({
      tenantId,
      displayName: draft.displayName.trim(),
      contactEmail: draft.contactEmail.trim(),
    });
  };

  return (
    <Modal
      title="编辑租户信息"
      visible
      okText="保存"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="显示名" required>
          <Input
            value={draft.displayName}
            onChange={(displayName) => setDraft((current) => ({ ...current, displayName }))}
          />
        </Form.Item>
        <Form.Item label="联系邮箱">
          <Input
            value={draft.contactEmail}
            onChange={(nextContactEmail) =>
              setDraft((current) => ({ ...current, contactEmail: nextContactEmail }))
            }
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function TenantSsoModal({
  enabled,
  provider,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  enabled: boolean;
  provider: string | null;
  onSubmit: (input: { ssoEnabled: boolean; provider?: string }) => void;
}) {
  const [draft, setDraft] = useState({ ssoEnabled: enabled, provider: provider ?? "" });

  const submit = () => {
    if (draft.ssoEnabled && !draft.provider.trim()) {
      showMessage({ type: "warning", content: "启用 SSO 时需要填写身份提供商" });
      return;
    }
    onSubmit({
      ssoEnabled: draft.ssoEnabled,
      provider: draft.ssoEnabled ? draft.provider.trim() : undefined,
    });
  };

  return (
    <Modal
      title="配置单点登录"
      visible
      okText="保存配置"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="SSO 状态" required>
          <Select
            value={draft.ssoEnabled ? "enabled" : "disabled"}
            options={[
              { label: "启用", value: "enabled" },
              { label: "停用", value: "disabled" },
            ]}
            onChange={(value) =>
              setDraft((current) => ({ ...current, ssoEnabled: value === "enabled" }))
            }
          />
        </Form.Item>
        {draft.ssoEnabled ? (
          <Form.Item label="身份提供商" required>
            <Input
              value={draft.provider}
              placeholder="例如 oidc、saml"
              onChange={(nextProvider) =>
                setDraft((current) => ({ ...current, provider: nextProvider }))
              }
            />
          </Form.Item>
        ) : null}
      </Form>
    </Modal>
  );
}

export function TenantQuotaRequestModal({
  item,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  item: TenantQuotaItem;
  onSubmit: (newValue: number) => void;
}) {
  const [newValue, setNewValue] = useState(item.total);

  const submit = () => {
    if (!Number.isFinite(newValue) || newValue < item.used) {
      showMessage({
        type: "warning",
        content: `新上限不能低于当前用量 ${item.used} ${item.unit}`,
      });
      return;
    }
    onSubmit(newValue);
  };

  return (
    <Modal
      title={`申请调整：${item.displayName}`}
      visible
      okText="提交申请"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label={`新上限（${item.unit}）`} required>
          <InputNumber
            className="w-full"
            min={item.used}
            precision={0}
            value={newValue}
            onChange={(value) => setNewValue(Number(value) || 0)}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function TenantPlanModal({
  plan,
  quotaMeta,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  plan?: TenantPlanDetail;
  quotaMeta: TenantQuotaMetaItem[];
  onSubmit: (input: CreateTenantPlanInput | { name: string; description: string }) => void;
}) {
  const [draft, setDraft] = useState({
    code: plan?.code ?? "",
    name: plan?.name ?? "",
    description: plan?.description ?? "",
    limits: Object.fromEntries(quotaMeta.map((item) => [item.resourceType, item.defaultQuota])),
  });

  const submit = () => {
    if (!draft.name.trim() || (!plan && !draft.code.trim())) {
      showMessage({ type: "warning", content: "请填写套餐编码和名称" });
      return;
    }
    if (plan) {
      onSubmit({ name: draft.name.trim(), description: draft.description.trim() });
      return;
    }
    onSubmit({
      code: draft.code.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      quotaLimits: quotaMeta.map((item) => ({
        resourceType: item.resourceType,
        total: draft.limits[item.resourceType] ?? item.defaultQuota,
      })),
    });
  };

  return (
    <Modal
      title={plan ? "编辑配额套餐" : "新建配额套餐"}
      visible
      style={{ width: 720 }}
      okText={plan ? "保存" : "创建草稿"}
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          <Form.Item label="套餐编码" required>
            <Input
              value={draft.code}
              disabled={Boolean(plan)}
              onChange={(code) => setDraft((current) => ({ ...current, code }))}
            />
          </Form.Item>
          <Form.Item label="套餐名称" required>
            <Input
              value={draft.name}
              onChange={(name) => setDraft((current) => ({ ...current, name }))}
            />
          </Form.Item>
        </div>
        <Form.Item label="说明">
          <Input.TextArea
            value={draft.description}
            onChange={(description) => setDraft((current) => ({ ...current, description }))}
          />
        </Form.Item>
        {!plan ? (
          <div className="grid max-h-72 grid-cols-2 gap-x-4 overflow-auto">
            {quotaMeta.map((item) => (
              <Form.Item key={item.resourceType} label={`${item.displayName}（${item.unit}）`}>
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={item.isDiscrete ? 0 : 2}
                  value={draft.limits[item.resourceType]}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      limits: {
                        ...current.limits,
                        [item.resourceType]: Number(value) || 0,
                      },
                    }))
                  }
                />
              </Form.Item>
            ))}
          </div>
        ) : null}
      </Form>
    </Modal>
  );
}

export function TenantPlanLimitsModal({
  limits,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  limits: TenantPlanQuotaLimit[];
  onSubmit: (items: Array<{ resourceType: string; total: number }>) => void;
}) {
  const [values, setValues] = useState<Record<string, number>>(() =>
    Object.fromEntries(limits.map((item) => [item.resourceType, item.total])),
  );

  return (
    <Modal
      title="编辑套餐限额"
      visible
      style={{ width: 680 }}
      okText="保存限额"
      confirmLoading={loading}
      onOk={() =>
        onSubmit(
          limits.map((item) => ({
            resourceType: item.resourceType,
            total: values[item.resourceType] ?? item.total,
          })),
        )
      }
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <div className="grid grid-cols-2 gap-x-4">
          {limits.map((item) => (
            <Form.Item key={item.resourceType} label={`${item.displayName}（${item.unit}）`}>
              <InputNumber
                className="w-full"
                min={0}
                precision={0}
                value={values[item.resourceType]}
                onChange={(value) =>
                  setValues((current) => ({
                    ...current,
                    [item.resourceType]: Number(value) || 0,
                  }))
                }
              />
            </Form.Item>
          ))}
        </div>
      </Form>
    </Modal>
  );
}

export function TenantPlanBindModal({
  tenants,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  tenants: BoundTenant[];
  onSubmit: (tenantId: string) => void;
}) {
  const [tenantId, setTenantId] = useState(tenants[0]?.id ?? "");

  return (
    <Modal
      title="绑定租户"
      visible
      okText="确认绑定"
      confirmLoading={loading}
      okButtonProps={{ disabled: !tenantId }}
      onOk={() => {
        if (tenantId) onSubmit(tenantId);
      }}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="目标租户" required>
          <Select
            value={tenantId}
            options={tenants.map((tenant) => ({
              label: `${tenant.displayName} · ${tenant.name}`,
              value: tenant.id,
            }))}
            onChange={setTenantId}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function TenantAdministratorInviteModal({
  tenantId,
  tenantOptions,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  tenantId?: string;
  tenantOptions: Array<{ id: string; name: string; displayName: string | null }>;
  onSubmit: (input: InviteTenantAdministratorInput) => void;
}) {
  const [draft, setDraft] = useState({
    tenantId: tenantId ?? tenantOptions[0]?.id ?? "",
    email: "",
    username: "",
  });

  const submit = () => {
    if (!draft.tenantId || !draft.email.includes("@") || !draft.username.trim()) {
      showMessage({ type: "warning", content: "请选择租户并填写有效的邮箱和用户名" });
      return;
    }
    onSubmit({
      tenantId: draft.tenantId,
      email: draft.email.trim(),
      username: draft.username.trim(),
    });
  };

  return (
    <Modal
      title="邀请租户管理员"
      visible
      okText="发送邀请"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="租户" required>
          <Select
            disabled={Boolean(tenantId)}
            value={draft.tenantId}
            options={tenantOptions.map((tenant) => ({
              label: `${tenant.displayName || tenant.name} · ${tenant.name}`,
              value: tenant.id,
            }))}
            onChange={(nextTenantId) =>
              setDraft((current) => ({ ...current, tenantId: nextTenantId }))
            }
          />
        </Form.Item>
        <Form.Item label="用户名" required>
          <Input
            value={draft.username}
            onChange={(username) => setDraft((current) => ({ ...current, username }))}
          />
        </Form.Item>
        <Form.Item label="邮箱" required>
          <Input
            value={draft.email}
            onChange={(email) => setDraft((current) => ({ ...current, email }))}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function TenantAdministratorRoleModal({
  roles,
  currentRole,
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & {
  roles: TenantRoleDefinition[];
  currentRole: string;
  onSubmit: (roleId: string) => void;
}) {
  const initialRole = roles.find((role) => role.name === currentRole)?.id ?? roles[0]?.id ?? "";
  const [roleId, setRoleId] = useState(initialRole);

  return (
    <Modal
      title="修改管理员角色"
      visible
      okText="保存角色"
      confirmLoading={loading}
      okButtonProps={{ disabled: !roleId }}
      onOk={() => {
        if (roleId) onSubmit(roleId);
      }}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="角色" required>
          <Select
            value={roleId}
            options={roles.map((role) => ({
              label: tenantAdministratorRoleLabels[role.name],
              value: role.id,
            }))}
            onChange={setRoleId}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function TenantAdministratorPasswordModal({
  loading,
  onCancel,
  onSubmit,
}: LoadingModalProps & { onSubmit: (newPassword: string) => void }) {
  const [password, setPassword] = useState("");

  const submit = () => {
    if (password.length < 8) {
      showMessage({ type: "warning", content: "新密码至少需要 8 位" });
      return;
    }
    onSubmit(password);
  };

  return (
    <Modal
      title="重置管理员密码"
      visible
      okText="确认重置"
      confirmLoading={loading}
      onOk={submit}
      onCancel={onCancel}
    >
      <Form layout="vertical">
        <Form.Item label="新密码" required>
          <Input.Password value={password} onChange={setPassword} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
