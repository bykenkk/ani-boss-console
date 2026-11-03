import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getBasicNetwork,
  platformNetworkKeys,
  setBasicNetworkAllocation,
  setBasicNetworkAutoAllocation,
  setDefaultBasicNetwork,
  type PlatformNetwork,
} from "@/api/platform-networks";
import type { RowAction } from "@/components/common";
import { usePlatformNetworkDelete } from "./usePlatformNetworkDelete";

async function currentBasicNetworkVersion(item: PlatformNetwork): Promise<string> {
  const current = await getBasicNetwork(item.id);
  const baseline = item.intranet_pool;
  const pool = current.intranet_pool;
  if (
    current.id !== item.id ||
    !baseline ||
    !pool ||
    Boolean(baseline.is_default) !== Boolean(pool.is_default) ||
    Boolean(baseline.new_vpcs_enabled) !== Boolean(pool.new_vpcs_enabled) ||
    Boolean(baseline.allocation_enabled) !== Boolean(pool.allocation_enabled) ||
    baseline.config_revision !== pool.config_revision
  ) {
    throw new Error("基础网络配置已变化，请刷新后重新操作");
  }
  return current.version;
}

export function useBasicNetworkActions(onDeleted: () => void) {
  const remove = usePlatformNetworkDelete("intranet-address-pools", onDeleted);
  const client = useQueryClient();
  const refresh = () =>
    client.invalidateQueries({ queryKey: platformNetworkKeys.all("intranet-address-pools") });
  const autoAllocation = useMutation({
    mutationFn: async ({ item, enabled }: { item: PlatformNetwork; enabled: boolean }) => {
      const expected_version = await currentBasicNetworkVersion(item);
      await setBasicNetworkAutoAllocation(item.id, { expected_version, enabled });
    },
    retry: false,
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
    mutationFn: async (item: PlatformNetwork) => {
      const expected_version = await currentBasicNetworkVersion(item);
      await setDefaultBasicNetwork(item.id, { expected_version });
    },
    retry: false,
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
  const allocation = useMutation({
    mutationFn: async ({ item, enabled }: { item: PlatformNetwork; enabled: boolean }) => {
      const expected_version = await currentBasicNetworkVersion(item);
      await setBasicNetworkAllocation(item.id, { expected_version, enabled });
    },
    retry: false,
    meta: {
      feedback: {
        channel: "notification",
        id: "basic-network-allocation",
        action: "更新基础网络地址分配",
        successText: "地址分配已更新",
      },
    },
    onSettled: refresh,
  });
  const busy = (item: PlatformNetwork) =>
    autoAllocation.isPending ||
    defaultPool.isPending ||
    allocation.isPending ||
    Boolean(remove.disabled?.(item));
  const unavailable = (item: PlatformNetwork) =>
    busy(item) || !item.intranet_pool || item.state !== "available" || item.observation_stale;
  const defaultDisabled = (item: PlatformNetwork) =>
    unavailable(item) || Boolean(item.intranet_pool?.is_default);
  const autoDisabled = (item: PlatformNetwork) =>
    item.intranet_pool?.new_vpcs_enabled ? busy(item) : unavailable(item);
  const allocationDisabled = (item: PlatformNetwork) =>
    item.intranet_pool?.allocation_enabled
      ? busy(item) || item.intranet_pool.new_vpcs_enabled
      : unavailable(item);
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
    {
      key: "allocation",
      label: (item) => (item.intranet_pool?.allocation_enabled ? "关闭地址分配" : "开启地址分配"),
      widthLabel: "关闭地址分配",
      disabled: allocationDisabled,
      tooltip: (item) =>
        item.intranet_pool?.new_vpcs_enabled ? "请先关闭新建 VPC 自动分配" : undefined,
      loading: (item) => allocation.isPending && allocation.variables?.item.id === item.id,
      onClick: (item) => {
        if (allocationDisabled(item)) return;
        const enabled = !item.intranet_pool?.allocation_enabled;
        Modal.confirm({
          title: enabled ? "开启基础网络地址分配" : "关闭基础网络地址分配",
          content: enabled
            ? `开启「${item.name}」的地址分配？新建 VPC 自动分配仍需单独开启。`
            : `关闭「${item.name}」的地址分配？已有 VPC 的基础 EIP 和 SNAT 保留。`,
          onOk: () => allocation.mutateAsync({ item, enabled }),
        });
      },
    },
    {
      ...remove,
      disabled: (item) => busy(item) || Boolean(item.intranet_pool?.allocation_enabled),
      tooltip: (item) => (item.intranet_pool?.allocation_enabled ? "请先关闭地址分配" : undefined),
    },
  ];
  return { actions };
}
