import { Modal, Select } from "@arco-design/web-react";
import { tenantQuotaPackages } from "@/components/tenant/model";

interface ConvertTrialModalProps {
  visible: boolean;
  planCode: string;
  onPlanCodeChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConvertTrialModal({
  visible,
  planCode,
  onPlanCodeChange,
  onCancel,
  onConfirm,
}: ConvertTrialModalProps) {
  return (
    <Modal
      title="转为正式租户"
      visible={visible}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="确认转正式"
    >
      <div className="mb-2 text-sm text-gray-600">正式配额策略</div>
      <Select
        value={planCode}
        className="w-full"
        options={tenantQuotaPackages
          .filter((item) => item.status === "enabled" && !item.isTrial)
          .map((item) => ({
            label: `${item.name} (${item.planCode})`,
            value: item.planCode,
          }))}
        onChange={onPlanCodeChange}
      />
    </Modal>
  );
}
