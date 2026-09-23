import { Button, Descriptions, Modal, Space, Typography } from "@arco-design/web-react";
import type { Tenant } from "@/components/tenant/model";
import { formatDateTimeMinute } from "@/lib/date";

interface TrialLifecycleSectionProps {
  tenant: Tenant;
  onExtendTrial: () => void;
  onOpenConvert: () => void;
  onSimulateTrialExpiry: () => void;
}

export function TrialLifecycleSection({
  tenant,
  onExtendTrial,
  onOpenConvert,
  onSimulateTrialExpiry,
}: TrialLifecycleSectionProps) {
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Typography.Title heading={6} className="!mb-0">
          试用生命周期
        </Typography.Title>
        {tenant.isTrial && tenant.status !== "disabled" ? (
          <Space wrap>
            <Button
              onClick={() =>
                Modal.confirm({
                  title: "试用延期",
                  content: `确认将 ${tenant.name} 的试用期延长 14 天？`,
                  onOk: onExtendTrial,
                })
              }
            >
              延期 14 天
            </Button>
            <Button onClick={onOpenConvert}>转为正式租户</Button>
            <Button
              status="warning"
              onClick={() =>
                Modal.confirm({
                  title: "模拟试用到期",
                  content: "模拟后租户将自动冻结，确认继续？",
                  onOk: onSimulateTrialExpiry,
                })
              }
            >
              模拟到期
            </Button>
          </Space>
        ) : null}
      </div>
      <Descriptions
        border
        column={3}
        data={[
          { label: "租户类型", value: tenant.isTrial ? "试用" : "正式" },
          { label: "当前配额策略", value: tenant.quotaPackage },
          { label: "试用到期", value: formatDateTimeMinute(tenant.trialEndsAt) },
        ]}
      />
    </section>
  );
}
