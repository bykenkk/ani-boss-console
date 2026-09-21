import { Progress, Tag } from "@arco-design/web-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  fetchTenantQuota,
  fetchTenantQuotaChangeRequests,
  getTenantManagementErrorMessage,
  reviewTenantQuotaChangeRequest,
  submitTenantQuotaChangeRequest,
  tenantManagementQueryKeys,
  type TenantQuotaItem,
} from "@/api/tenant";
import { DataTable, type ListColumn } from "@/components/common";
import { formatDateTime } from "@/lib/date";
import { withId } from "@/lib/id";
import { quotaRequestStatusMeta } from "../../apiModel";
import { TenantQuotaRequestModal } from "../../TenantManagementModals";

interface TenantQuotaManagementProps {
  tenantId: string;
  canManage: boolean;
}

async function runTenantQuotaOperation<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    throw new Error(getTenantManagementErrorMessage(error));
  }
}

const quotaColumns: ListColumn<TenantQuotaItem>[] = [
  { title: "资源维度", dataIndex: "displayName", width: 180 },
  { title: "资源标识", dataIndex: "resourceType", width: 180 },
  { title: "已用", dataIndex: "used", width: 100, align: "right" },
  { title: "上限", dataIndex: "total", width: 100, align: "right" },
  { title: "单位", dataIndex: "unit", width: 100 },
  {
    title: "使用率",
    width: 180,
    render: (_, item) => {
      const percent =
        item.total > 0 ? Math.min(100, Math.round((item.used / item.total) * 100)) : 0;
      return <Progress percent={percent} size="small" />;
    },
  },
];

export function TenantQuotaManagement({ tenantId, canManage }: TenantQuotaManagementProps) {
  const queryClient = useQueryClient();
  const [quotaTarget, setQuotaTarget] = useState<TenantQuotaItem | null>(null);
  const quotaQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-quota", tenantId),
        action: "租户配额加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantQuota(tenantId),
    queryFn: () => fetchTenantQuota(tenantId),
  });
  const quotaRequestsQuery = useQuery({
    meta: {
      errorNotification: {
        id: withId("tenant-quota-requests", tenantId),
        action: "配额申请加载",
        fallback: "请求失败，请稍后重试",
      },
    },
    queryKey: tenantManagementQueryKeys.tenantQuotaRequests(tenantId),
    queryFn: () => fetchTenantQuotaChangeRequests(tenantId),
  });
  const invalidateAll = () =>
    queryClient.invalidateQueries({ queryKey: tenantManagementQueryKeys.all });
  const quotaRequestMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额调整申请",
        successText: "配额调整申请已提交",
        errorFallback: "配额调整申请失败，请稍后重试",
      },
    },
    mutationFn: ({ resourceType, newValue }: { resourceType: string; newValue: number }) =>
      runTenantQuotaOperation(() =>
        submitTenantQuotaChangeRequest({ tenantId, items: [{ resourceType, newValue }] }),
      ),
    onSuccess: async () => {
      await invalidateAll();
      setQuotaTarget(null);
    },
  });
  const quotaReviewMutation = useMutation({
    meta: {
      feedback: {
        channel: "message",
        action: "配额申请审批",
        successText: "配额申请已处理",
        errorFallback: "配额申请处理失败，请稍后重试",
      },
    },
    mutationFn: ({ requestId, approved }: { requestId: string; approved: boolean }) =>
      runTenantQuotaOperation(() =>
        reviewTenantQuotaChangeRequest({ tenantId, requestId, approved }),
      ),
    onSuccess: invalidateAll,
  });
  const operationPending = quotaRequestMutation.isPending || quotaReviewMutation.isPending;

  return (
    <>
      <div className="space-y-6 py-4">
        <section>
          <h3 className="mb-3 text-sm font-medium">当前配额</h3>
          <DataTable
            rowKey="resourceType"
            columns={quotaColumns}
            data={quotaQuery.data || []}
            loading={quotaQuery.isPending}
            pagination={false}
            rowActions={[
              {
                key: "request",
                label: "申请调整",
                disabled: () => !canManage || operationPending,
                onClick: setQuotaTarget,
              },
            ]}
            scroll={{ x: 1000 }}
            noDataElement={<div className="py-8 text-center text-gray-500">暂无配额</div>}
          />
        </section>
        <section>
          <h3 className="mb-3 text-sm font-medium">调整申请</h3>
          <DataTable
            rowKey={(item) => `${item.requestId}-${item.resourceType}`}
            columns={[
              { title: "申请单", dataIndex: "requestId", width: 180 },
              { title: "资源维度", dataIndex: "resourceType", width: 160 },
              { title: "原值", dataIndex: "oldValue", width: 90, align: "right" },
              { title: "新值", dataIndex: "newValue", width: 90, align: "right" },
              {
                title: "状态",
                width: 100,
                render: (_, item) => {
                  const meta = quotaRequestStatusMeta[item.status];
                  return <Tag color={meta.color}>{meta.label}</Tag>;
                },
              },
              { title: "申请人", dataIndex: "requestedBy", width: 140 },
              {
                title: "申请时间",
                dataIndex: "createdAt",
                width: 180,
                render: (value: string) => formatDateTime(value),
              },
            ]}
            data={quotaRequestsQuery.data || []}
            loading={quotaRequestsQuery.isPending}
            pagination={false}
            rowActions={[
              {
                key: "approve",
                label: "通过",
                visible: (item) => item.status === "pending",
                disabled: () => !canManage || operationPending,
                onClick: (item) =>
                  quotaReviewMutation.mutate({ requestId: item.requestId, approved: true }),
              },
              {
                key: "reject",
                label: "驳回",
                intent: "danger",
                visible: (item) => item.status === "pending",
                disabled: () => !canManage || operationPending,
                onClick: (item) =>
                  quotaReviewMutation.mutate({ requestId: item.requestId, approved: false }),
              },
            ]}
            scroll={{ x: 1100 }}
            noDataElement={<div className="py-8 text-center text-gray-500">暂无调整申请</div>}
          />
        </section>
      </div>

      {quotaTarget ? (
        <TenantQuotaRequestModal
          item={quotaTarget}
          loading={quotaRequestMutation.isPending}
          onCancel={() => setQuotaTarget(null)}
          onSubmit={(newValue) =>
            quotaRequestMutation.mutate({
              resourceType: quotaTarget.resourceType,
              newValue,
            })
          }
        />
      ) : null}
    </>
  );
}
