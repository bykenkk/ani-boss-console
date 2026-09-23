import { Button, Descriptions, Space, Typography } from "@arco-design/web-react";
import type { Tenant } from "@/components/tenant/model";

interface QuotaOverviewProps {
  tenant: Tenant;
  onRefresh: () => void;
  onRebindPackage: () => void;
}

export function QuotaOverview({ tenant, onRefresh, onRebindPackage }: QuotaOverviewProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title heading={6} className="!mb-0">
          当前配额策略
        </Typography.Title>
        <Space wrap>
          <Button onClick={onRefresh}>刷新用量</Button>
          <Button type="primary" onClick={onRebindPackage}>
            改绑配额策略
          </Button>
        </Space>
      </div>
      <Descriptions
        border
        column={3}
        data={[
          {
            label: "配额策略",
            value: `${tenant.quotaPackage} (${tenant.planCode})`,
          },
          {
            label: "租户类型",
            value: tenant.isTrial ? "试用租户" : "正式租户",
          },
          {
            label: "配额状态",
            value: tenant.status === "disabled" ? "已停止" : "生效中",
          },
        ]}
      />
    </section>
  );
}
