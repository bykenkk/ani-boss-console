import { useState } from "react";
import { Button, Input, Select } from "@arco-design/web-react";
import { TenantSelect } from "@/components/tenant/TenantSelect";
import type { EIPListParams } from "@/api/eips";

interface EIPFiltersProps {
  value: EIPListParams;
  onChange: (value: EIPListParams) => void;
}
export function EIPFilters({ value, onChange }: EIPFiltersProps) {
  const [keyword, setKeyword] = useState(value.name ?? "");
  const hasFilters = Boolean(keyword || value.name || value.tenant_id !== undefined || value.scope);
  const clearSearch = () => {
    setKeyword("");
    onChange({ ...value, name: undefined });
  };

  // TODO(eip-binding-filter): 平台列表接口支持服务端绑定状态筛选后，增加已绑定／未绑定筛选。
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex">
        <Input.Search
          aria-label="搜索弹性 IP 名称"
          placeholder="请输入名称"
          allowClear
          value={keyword}
          onChange={setKeyword}
          onSearch={(text) => {
            const trimmed = text.trim();
            setKeyword(trimmed);
            onChange({ ...value, name: trimmed || undefined });
          }}
          onClear={clearSearch}
        />
      </div>
      <div className="flex">
        <TenantSelect
          placeholder="所属租户"
          value={value.tenant_id}
          onChange={(tenant_id) => onChange({ ...value, tenant_id })}
        />
      </div>
      <div className="flex">
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
      </div>
      <Button disabled={!hasFilters} onClick={() => onChange({})}>
        重置
      </Button>
    </div>
  );
}
