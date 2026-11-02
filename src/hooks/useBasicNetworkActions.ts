import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  platformNetworkKeys,
  setBasicNetworkAutoAllocation,
  setDefaultBasicNetwork,
  type PlatformNetwork,
} from "@/api/platform-networks";
import type { RowAction } from "@/components/common";
import { usePlatformNetworkDelete } from "./usePlatformNetworkDelete";

export function useBasicNetworkActions(onDeleted: () => void) {
  const remove = usePlatformNetworkDelete("intranet-address-pools", onDeleted);
  const client = useQueryClient();
  const refresh = () =>
    client.invalidateQueries({ queryKey: platformNetworkKeys.all("intranet-address-pools") });
  const autoAllocation = useMutation({
    mutationFn: ({ item, enabled }: { item: PlatformNetwork; enabled: boolean }) =>
      setBasicNetworkAutoAllocation(item.id, { expected_version: item.version, enabled }),
    meta: {
      feedback: {
        channel: "notification",
        id: "basic-network-auto-allocation",
        action: "更新新建 VPC 自动分配",
        successText: "自动分配已更新",
      },
    },
    onSettled: refresh,
  });
  const defaultPool = useMutation({
    mutationFn: (item: PlatformNetwork) =>
      setDefaultBasicNetwork(item.id, { expected_version: item.version }),
    meta: {
      feedback: {
        channel: "notification",
        id: "basic-network-default",
        action: "设置默认基础网络",
        successText: "默认基础网络已更新",
      },
    },
    onSettled: refresh,
  });
  const busy = (item: PlatformNetwork) =>
    autoAllocation.isPending || defaultPool.isPending || Boolean(remove.disabled?.(item));
  const unavailable = (item: PlatformNetwork) =>
    busy(item) || !item.intranet_pool || item.state !== "available" || item.observation_stale;
  const defaultDisabled = (item: PlatformNetwork) =>
    unavailable(item) || Boolean(item.intranet_pool?.is_default);
  const autoDisabled = (item: PlatformNetwork) =>
    item.intranet_pool?.new_vpcs_enabled ? busy(item) : unavailable(item);
  const actions: RowAction<PlatformNetwork>[] = [
    {
      key: "default",
      label: (item) => (item.intranet_pool?.is_default ? "当前默认" : "设为默认"),
      widthLabel: "设为默认",
      disabled: defaultDisabled,
      loading: (item) => defaultPool.isPending && defaultPool.variables?.id === item.id,
      onClick: (item) => {
        if (defaultDisabled(item)) return;
        Modal.confirm({
          title: "设为默认基础网络",
          content: `将「${item.name}」设为默认基础网络？自动分配开启时，后续新建 VPC 将使用该网络；已有 VPC 不变。`,
          onOk: () => defaultPool.mutateAsync(item),
        });
      },
    },
    {
      key: "auto-allocation",
      label: (item) => (item.intranet_pool?.new_vpcs_enabled ? "关闭自动分配" : "开启自动分配"),
      widthLabel: "关闭自动分配",
      disabled: autoDisabled,
      loading: (item) => autoAllocation.isPending && autoAllocation.variables?.item.id === item.id,
      onClick: (item) => {
        if (autoDisabled(item)) return;
        const enabled = !item.intranet_pool?.new_vpcs_enabled;
        Modal.confirm({
          title: enabled ? "开启新建 VPC 自动分配" : "关闭新建 VPC 自动分配",
          content: enabled
            ? `将「${item.name}」设为默认基础网络并开启地址分配，后续租户新建 VPC 将自动创建基础 EIP 和 SNAT。已有 VPC 不变。`
            : `关闭「${item.name}」的新建 VPC 自动分配？已有 VPC 的基础 EIP 和 SNAT 保留。`,
          onOk: () => autoAllocation.mutateAsync({ item, enabled }),
        });
      },
    },
    { ...remove, disabled: busy },
  ];
  return { actions };
}
