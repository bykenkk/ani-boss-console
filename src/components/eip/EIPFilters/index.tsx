import { Button, Input, Select, Space } from "@arco-design/web-react";
import { TenantSelect } from "@/components/tenant/TenantSelect";
import type { EIPListParams } from "@/api/eips";

interface EIPFiltersProps {
  value: EIPListParams;
  onChange: (value: EIPListParams) => void;
}
export function EIPFilters({ value, onChange }: EIPFiltersProps) {
  return (
    <Space wrap>
      <TenantSelect
        value={value.tenant_id}
        onChange={(tenant_id) => onChange({ ...value, tenant_id })}
      />
      <Input.Search
        aria-label="搜索 EIP 名称"
        placeholder="搜索 EIP 名称"
        allowClear
        onSearch={(name) => onChange({ ...value, name: name.trim() || undefined })}
        onClear={() => onChange({ ...value, name: undefined })}
      />
      <Input.Search
        aria-label="筛选 IP 地址"
        placeholder="完整 IP 地址"
        allowClear
        onSearch={(address) => onChange({ ...value, address: address.trim() || undefined })}
        onClear={() => onChange({ ...value, address: undefined })}
      />
      <Input.Search
        aria-label="筛选地址池 ID"
        placeholder="地址池 ID"
        allowClear
        onSearch={(pool_id) => onChange({ ...value, pool_id: pool_id.trim() || undefined })}
        onClear={() => onChange({ ...value, pool_id: undefined })}
      />
      <Select
        aria-label="EIP 状态"
        placeholder="全部状态"
        allowClear
        value={value.state}
        onChange={(state) => onChange({ ...value, state })}
        options={[
          { value: "provisioning", label: "创建中" },
          { value: "available", label: "可用" },
          { value: "degraded", label: "降级" },
          { value: "failed", label: "失败" },
          { value: "deleting", label: "释放中" },
        ]}
      />
      <Select
        aria-label="地址类型"
        placeholder="全部地址类型"
        allowClear
        value={value.scope}
        onChange={(scope) => onChange({ ...value, scope })}
        options={[
          { value: "public", label: "公网" },
          { value: "intranet", label: "基础内网" },
        ]}
      />
      <Button onClick={() => onChange({})}>清空筛选</Button>
    </Space>
  );
}
