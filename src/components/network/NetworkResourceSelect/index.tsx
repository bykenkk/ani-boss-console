import { Select } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listVirtualSwitches } from "@/api/virtual-switches";
import { withFirst100 } from "@/api/pagination";
import { listPlatformNetworks } from "@/api/platform-networks";
interface NetworkResourceSelectProps {
  kind: "virtual-switch" | "vlan" | "public-pool";
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}
const listSwitchOptions = withFirst100(listVirtualSwitches);
export function NetworkResourceSelect({
  kind,
  value,
  onChange,
  disabled,
}: NetworkResourceSelectProps) {
  const [name, setName] = useState("");
  const query = useQuery({
    queryKey: ["network-resource-options", kind, name],
    queryFn: async ({ signal }) => {
      // TODO(options-pagination): 仅取服务端首 100 项；后续迁移专用选项接口。
      const result =
        kind === "virtual-switch"
          ? await listSwitchOptions({ name: name || undefined }, signal)
          : await listPlatformNetworks(
              kind === "vlan" ? "vlan-networks" : "public-address-pools",
              {
                name: name || undefined,
                state: kind === "public-pool" ? "available" : undefined,
                limit: 100,
              },
              signal,
            );
      return result.items;
    },
    enabled: !disabled,
    meta: { errorNotification: { id: `${kind}-options`, action: "网络选项加载" } },
  });
  return (
    <Select
      value={value}
      onChange={onChange}
      disabled={disabled}
      showSearch
      filterOption={false}
      onSearch={setName}
      loading={query.isFetching}
      placeholder="请输入名称搜索并选择"
      options={(query.data ?? []).map((item) => ({ label: item.name, value: item.id }))}
    />
  );
}
