import { Button, Empty, Form, InputNumber, Spin } from "@arco-design/web-react";
import type { TenantQuotaMetaItem } from "@/api/tenant";

interface TenantPlanQuotaFieldsProps {
  quotaMeta: TenantQuotaMetaItem[];
  loading: boolean;
  onRefresh: () => void;
}

export function TenantPlanQuotaFields({
  quotaMeta,
  loading,
  onRefresh,
}: TenantPlanQuotaFieldsProps) {
  return (
    <>
      <Spin loading={loading} className="w-full">
        {!quotaMeta.length ? (
          <Empty description="暂无可配置的配额维度" />
        ) : (
          <div className="grid max-h-72 grid-cols-2 gap-x-4 overflow-auto">
            {quotaMeta.map((item) => (
              <Form.Item
                key={item.resourceType}
                label={`${item.displayName}（${item.unit}）`}
                field={`limits.${item.resourceType}`}
                initialValue={item.defaultQuota}
                rules={[
                  {
                    validator: (value, callback) => {
                      callback(
                        value != null &&
                          (!Number.isFinite(value) ||
                            value < 0 ||
                            (item.isDiscrete && !Number.isInteger(value)))
                          ? "请输入有效的非负限额，离散资源仅支持整数"
                          : undefined,
                      );
                    },
                  },
                ]}
              >
                <InputNumber
                  className="w-full"
                  min={0}
                  precision={item.isDiscrete ? 0 : 2}
                  placeholder={`留空使用默认值 ${item.defaultQuota}`}
                />
              </Form.Item>
            ))}
          </div>
        )}
      </Spin>
      {!quotaMeta.length && (
        <Button className="mt-3" loading={loading} onClick={onRefresh}>
          刷新配额维度
        </Button>
      )}
    </>
  );
}
