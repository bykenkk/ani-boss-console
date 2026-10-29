import { Select } from "@arco-design/web-react";
import { demoLayer2Networks } from "../demo-data";

interface NetworkLayer2SelectProps {
  value?: string;
  onChange?: (value: string | undefined) => void;
}

export function NetworkLayer2Select({ value, onChange }: NetworkLayer2SelectProps) {
  return (
    <Select
      value={value}
      onChange={onChange}
      allowClear
      filterOption={false}
      aria-label="二层网络"
      placeholder="请选择二层网络（演示）"
      options={demoLayer2Networks.map((network) => ({
        value: network.id,
        label: `${network.name} · VLAN ${network.vlanId}`,
      }))}
    />
  );
}
