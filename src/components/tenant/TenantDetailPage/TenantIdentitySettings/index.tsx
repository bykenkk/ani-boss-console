import { Button, Descriptions, Space } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchTenantAuth,
  getTenantManagementErrorMessage,
  tenantManagementQueryKeys,
  testTenantSso,
  updateTenantMfa,
  updateTenantSso,
} from "@/api/tenant";
import { formatDateTime } from "@/lib/date";
import { showMessage } from "@/lib/feedback";
import { withId } from "@/lib/id";
import { TenantSsoModal } from "../../TenantManagementModals";

interface TenantIdentitySettingsProps {
  tenantId: string;
  canManage: boolean;
}

async function runTenantIdentityOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

export function TenantIdentitySettings({ tenantId, canManage }: TenantIdentitySettingsProps) {
  const queryClient = useQueryClient();
  const [ssoVisible, setSsoVisible] = useState(false);
  const authQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-auth", tenantId),
        action: "租户认证配置加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantAuth(tenantId),
    queryFn: () => fetchTenantAuth(tenantId),
  });
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const ssoMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "SSO 配置更新",
        successText: "SSO 配置已更新",
        errorFallback: "SSO 配置更新失败，请稍后重试",
      },
    },
    mutationFn: (input: { ssoEnabled: boolean; provider?: string }) =>
      runTenantIdentityOperation(() => updateTenantSso({ tenantId, ...input })),
    onSuccess: async () => {
      await invalidateAll();
      setSsoVisible(false);
    },
  });
  const mfaMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "MFA 策略更新",
        successText: "MFA 策略已更新",
        errorFallback: "MFA 策略更新失败，请稍后重试",
      },
    },
    mutationFn: (required: boolean) =>
      runTenantIdentityOperation(() => updateTenantMfa(tenantId, required)),
    onSuccess: invalidateAll,
  });
  const ssoTestMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "SSO 连通性测试",
        errorFallback: "SSO 连通性测试失败，请稍后重试",
      },
    },
    mutationFn: () => runTenantIdentityOperation(() => testTenantSso(tenantId)),
    onSuccess: (result) => {
      showMessage({
        type: result.success ? "success" : "warning",
        content: result.success ? "SSO 连通性测试通过" : result.error || "SSO 连通性测试未通过",
      });
    },
  });

  const auth = authQuery.data;
  const operationPending =
    authQuery.isPending ||
    ssoMutation.isPending ||
    mfaMutation.isPending ||
    ssoTestMutation.isPending;

  return (
    <>
      <div className="space-y-4">
        <Descriptions
          column={1}
          data={[
            { label: "SSO", value: auth?.ssoEnabled ? "已启用" : "未启用" },
            { label: "身份提供商", value: auth?.provider || "-" },
            { label: "强制 MFA", value: auth?.mfaRequired ? "已启用" : "未启用" },
            { label: "配置更新时间", value: formatDateTime(auth?.updatedAt) },
          ]}
        />
        <Space wrap>
          <Button disabled={!canManage || operationPending} onClick={() => setSsoVisible(true)}>
            配置 SSO
          </Button>
          <Button
            disabled={!canManage || operationPending}
            onClick={() => mfaMutation.mutate(!auth?.mfaRequired)}
          >
            {auth?.mfaRequired ? "关闭强制 MFA" : "开启强制 MFA"}
          </Button>
          <Button
            loading={ssoTestMutation.isPending}
            disabled={!canManage || !auth?.ssoEnabled}
            onClick={() => ssoTestMutation.mutate()}
          >
            测试 SSO
          </Button>
        </Space>
      </div>

      {ssoVisible ? (
        <TenantSsoModal
          enabled={auth?.ssoEnabled ?? false}
          provider={auth?.provider ?? null}
          loading={ssoMutation.isPending}
          onCancel={() => setSsoVisible(false)}
          onSubmit={(input) => ssoMutation.mutate(input)}
        />
      ) : null}
    </>
  );
}
