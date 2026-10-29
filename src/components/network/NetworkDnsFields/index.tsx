import { Button, Input } from "@arco-design/web-react";
import { IconDelete, IconPlus } from "@arco-design/web-react/icon";

interface NetworkDnsFieldsProps {
  value?: string[];
  onChange?: (value: string[]) => void;
}

export function NetworkDnsFields({ value = [], onChange }: NetworkDnsFieldsProps) {
  return (
    <div className="flex flex-col gap-3">
      {value.map((address, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={address}
            placeholder="例如 223.5.5.5"
            aria-label={`DNS 地址 ${index + 1}`}
            onChange={(next) =>
              onChange?.(value.map((item, itemIndex) => (itemIndex === index ? next : item)))
            }
          />
          <Button
            icon={<IconDelete />}
            aria-label={`移除 DNS 地址 ${index + 1}`}
            title="移除 DNS 地址"
            onClick={() => onChange?.(value.filter((_, itemIndex) => itemIndex !== index))}
          />
        </div>
      ))}
      <Button type="dashed" icon={<IconPlus />} onClick={() => onChange?.([...value, ""])}>
        添加 DNS
      </Button>
    </div>
  );
}
