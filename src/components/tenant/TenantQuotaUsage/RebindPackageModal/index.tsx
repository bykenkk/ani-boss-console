import { Alert, Modal, Select } from "@arco-design/web-react";
import { tenantQuotaPackages } from "@/components/tenant/model";

interface RebindPackageModalProps {
  visible: boolean;
  planCode: string;
  onPlanCodeChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
}

export function RebindPackageModal({
  visible,
  planCode,
  onPlanCodeChange,
  onCancel,
  onConfirm,
}: RebindPackageModalProps) {
  return (
    <Modal
      title="改绑配额策略"
      visible={visible}
      onCancel={onCancel}
      onOk={onConfirm}
      okText="确认改绑"
    >
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm text-gray-600">目标配额策略</div>
          <Select
            value={planCode}
            onChange={onPlanCodeChange}
            className="w-full"
            options={tenantQuotaPackages
              .filter((item) => item.status === "enabled")
              .map((item) => ({
                label: `${item.name} (${item.planCode})`,
                value: item.planCode,
              }))}
          />
        </div>
        <Alert
          type="warning"
          content="改绑只更新策略归属；租户当前已审批或特批的配额上限将保持不变。"
        />
      </div>
    </Modal>
  );
}
