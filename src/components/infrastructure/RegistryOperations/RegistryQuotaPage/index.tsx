import { Progress, Select, Space } from "@arco-design/web-react";
import { useMemo, useState } from "react";
import {
  ResourceNameId,
  ListDataTable,
  ResourcePageFrame,
  TableSectionFrame,
  type ListColumn,
  StatusBadge,
  type StatusBadgeTone,
} from "@/components/common";
import { Metric } from "@/components/overview/Metric";
import { percentOf, registryTenantQuotas, type RegistryTenantQuota } from "../model";

type QuotaStatus = "normal" | "attention" | "full" | "pending";

function quotaStatus(quota: RegistryTenantQuota): QuotaStatus {
  if (quota.pendingExpandGi) return "pending";
  const percent = percentOf(quota.usedGi, quota.maxGi);
  if (percent >= 100) return "full";
  if (percent >= 80) return "attention";
  return "normal";
}

const statusMeta: Record<QuotaStatus, { label: string; tone: StatusBadgeTone }> = {
  normal: { label: "正常", tone: "success" },
  attention: { label: "关注", tone: "warning" },
  full: { label: "已满", tone: "danger" },
  pending: { label: "待审批", tone: "info" },
};

export function RegistryQuotaPage() {
  const [status, setStatus] = useState("all");
  const [keyword, setKeyword] = useState("");

  const filteredQuotas = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return registryTenantQuotas.filter((quota) => {
      const matchesStatus = status === "all" || quotaStatus(quota) === status;
      const matchesKeyword = !query || `${quota.name} ${quota.code}`.toLowerCase().includes(query);
      return matchesStatus && matchesKeyword;
    });
  }, [keyword, status]);

  const fullCount = registryTenantQuotas.filter(
    (quota) => percentOf(quota.usedGi, quota.maxGi) >= 100,
  ).length;
  const pendingCount = registryTenantQuotas.filter((quota) => quota.pendingExpandGi).length;
  const totalUsed = registryTenantQuotas.reduce((total, quota) => total + quota.usedGi, 0);
  const totalQuota = registryTenantQuotas.reduce((total, quota) => total + quota.maxGi, 0);

  const columns: ListColumn<RegistryTenantQuota>[] = [
    {
      title: "租户",
      dataIndex: "name",
      width: 220,
      fixed: "left",
      render: (_, quota) => <ResourceNameId name={quota.name} id={quota.code} />,
    },
    {
      title: "状态",
      width: 120,
      render: (_, quota) => {
        const meta = statusMeta[quotaStatus(quota)];
        return <StatusBadge value={meta.label} tone={meta.tone} />;
      },
    },
    {
      title: "使用量",
      width: 280,
      render: (_, quota) => {
        const percent = percentOf(quota.usedGi, quota.maxGi);
        return (
          <div className="flex items-center gap-3">
            <Progress
              percent={percent}
              showText={false}
              status={percent >= 100 ? "error" : percent >= 80 ? "warning" : "normal"}
              className="min-w-36 flex-1"
            />
            <span className="w-24 text-right text-xs text-gray-600">
              {quota.usedGi} / {quota.maxGi} Gi
            </span>
          </div>
        );
      },
    },
    { title: "镜像数", dataIndex: "imageCount", width: 100 },
    { title: "项目数", dataIndex: "projectCount", width: 100 },
    {
      title: "待审批扩容",
      width: 150,
      render: (_, quota) =>
        quota.pendingExpandGi ? (
          <span className="font-medium text-blue-700">
            {quota.maxGi} → {quota.pendingExpandGi} Gi
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        ),
    },
    {
      title: "剩余容量",
      width: 120,
      render: (_, quota) => `${Math.max(0, quota.maxGi - quota.usedGi).toFixed(1)} Gi`,
    },
  ];

  return (
    <ResourcePageFrame
      header={{
        title: "镜像配额",
        subtitle:
          "按租户查看镜像仓库存储配额、使用水位与待审批扩容申请；镜像 Gi 与算力、租户存储配额相互独立。",
      }}
    >
      <section className="grid grid-cols-4 gap-3.5 max-[1100px]:grid-cols-2">
        <Metric label="租户数" value={String(registryTenantQuotas.length)} hint="全平台" />
        <Metric
          label="平台镜像用量"
          value={`${totalUsed.toFixed(1)} Gi`}
          hint={`总配额 ${totalQuota} Gi`}
        />
        <Metric label="已满租户" value={String(fullCount)} hint="推送将被拦截" />
        <Metric label="待审批" value={String(pendingCount)} hint="扩容申请" />
      </section>

      <TableSectionFrame
        toolbar={{
          search: {
            fields: [{ value: "keyword", label: "关键词" }],
            field: "keyword",
            value: keyword,
            placeholder: "搜索租户名称或编码",
            onFieldChange: () => undefined,
            onChange: setKeyword,
          },
          filters: (
            <Space>
              <Select
                value={status}
                onChange={setStatus}
                options={[
                  { label: "全部状态", value: "all" },
                  { label: "正常", value: "normal" },
                  { label: "关注", value: "attention" },
                  { label: "已满", value: "full" },
                  { label: "待审批", value: "pending" },
                ]}
              />
            </Space>
          ),
          tools: (
            <span className="text-xs text-gray-500">
              显示 {filteredQuotas.length} / {registryTenantQuotas.length} 个租户 · 调整接口待接入
            </span>
          ),
        }}
      >
        <ListDataTable
          rowKey="id"
          columns={columns}
          rowActions={[
            {
              key: "adjust-quota",
              label: "调整配额",
              disabled: () => true,
              tooltip: "调整接口待接入",
              onClick: () => undefined,
            },
          ]}
          data={filteredQuotas}
          pagination={false}
          scroll={{ x: 1200 }}
          emptyText="没有符合筛选条件的租户镜像配额"
        />
      </TableSectionFrame>
    </ResourcePageFrame>
  );
}
