import { Alert, Button, Form, Input, Select, Space } from "@arco-design/web-react";
import { Link } from "@tanstack/react-router";
import type { AvailableTenantPlan } from "@/api/tenant";

interface TenantCreateFieldsProps {
  step: number;
  plans: AvailableTenantPlan[];
  plansPending: boolean;
  plansReady: boolean;
  onRefresh: () => void;
}
const requiredText = [{ required: true, match: /\S/, message: "请填写此项" }];
const emailRules = [
  { required: true, message: "请填写邮箱" },
  { type: "email" as const, message: "请输入有效的邮箱" },
];

export function TenantCreateFields({
  step,
  plans,
  plansPending,
  plansReady,
  onRefresh,
}: TenantCreateFieldsProps) {
  return (
    <>
      <div hidden={step !== 1}>
        <Form.Item
          label="租户标识"
          field="name"
          rules={[
            { required: true, message: "请填写租户标识" },
            {
              validator: (value, callback) => {
                callback(
                  /^[a-zA-Z0-9-]{3,40}$/.test(String(value || "").trim())
                    ? undefined
                    : "租户标识需为 3–40 位字母、数字或连字符",
                );
              },
            },
          ]}
        >
          <Input placeholder="例如 acme-ai" />
        </Form.Item>
        <Form.Item label="显示名" field="displayName" rules={requiredText}>
          <Input placeholder="企业或组织名称" />
        </Form.Item>
        <Form.Item label="联系邮箱" field="contactEmail" rules={emailRules}>
          <Input placeholder="contact@example.com" />
        </Form.Item>
      </div>
      <div hidden={step !== 2}>
        <Form.Item
          label="配额策略"
          field="planId"
          rules={[
            { required: true, message: "请选择已发布的配额策略" },
            {
              validator: (value, callback) => {
                callback(
                  plans.some((plan) => plan.id === value)
                    ? undefined
                    : "所选策略不可用，请重新选择已发布的策略",
                );
              },
            },
          ]}
        >
          <Select
            loading={plansPending}
            placeholder="请选择已发布的配额策略"
            options={plans.map((plan) => ({
              label: `${plan.name} · ${plan.code}`,
              value: plan.id,
            }))}
          />
        </Form.Item>
        {plansReady && !plansPending && !plans.length && (
          <Alert type="warning" content="暂无已发布的配额策略，请先发布策略，再返回继续开通。" />
        )}
        <Space className="mt-3">
          <Link to="/tenants-quotas" target="_blank" rel="noopener noreferrer">
            前往配额策略
          </Link>
          <Button loading={plansPending} onClick={onRefresh}>
            刷新可用策略
          </Button>
        </Space>
      </div>
      <div hidden={step !== 3}>
        <Form.Item
          label="管理员登录用户名"
          field="administratorName"
          rules={requiredText}
          extra="用于登录 Console；邮箱仅作为联系信息。"
        >
          <Input autoComplete="off" placeholder="请输入管理员登录用户名" />
        </Form.Item>
        <Form.Item label="管理员邮箱" field="administratorEmail" rules={emailRules}>
          <Input placeholder="admin@example.com" />
        </Form.Item>
        <Form.Item
          label="管理员初始密码"
          field="administratorPassword"
          rules={[
            { required: true, message: "请设置管理员初始密码" },
            {
              validator: (value, callback) => {
                const password = String(value || "");
                const bytes = new TextEncoder().encode(password).length;
                const classes = [/\p{Lu}/u, /\p{Ll}/u, /\p{Nd}/u, /[\p{P}\p{S}]/u].filter(
                  (pattern) => pattern.test(password),
                ).length;
                callback(
                  bytes < 8 || bytes > 64 || classes < 3
                    ? "密码长度需为 8–64，且至少包含大写、小写、数字、特殊字符中的三类；中文等字符占多个长度单位"
                    : undefined,
                );
              },
            },
          ]}
        >
          <Input.Password autoComplete="new-password" placeholder="8–64 位，至少包含三类字符" />
        </Form.Item>
      </div>
    </>
  );
}
