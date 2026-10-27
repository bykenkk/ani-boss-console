import { usePlatformNetworkDelete } from "./usePlatformNetworkDelete";
import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  platformNetworkKeys,
  setDefaultPublicPool,
  setPublicPoolAllocation,
  type PlatformNetwork,
} from "@/api/platform-networks";
import type { RowAction } from "@/components/common";
export function usePublicNetworkActions(onDeleted: () => void) {
  const remove = usePlatformNetworkDelete("public-address-pools", onDeleted);
  const queryClient = useQueryClient();
  const allocation = useMutation({
    mutationFn: ({ item, enabled }: { item: PlatformNetwork; enabled: boolean }) =>
      setPublicPoolAllocation(item.id, { expected_version: item.version, enabled }),
    meta: {
      feedback: {
        channel: "notification",
        id: "public-pool-allocation",
        action: "更新公网池分配状态",
        successText: "更新已提交",
      },
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: platformNetworkKeys.all("public-address-pools"),
      });
    },
  });
  const defaultPool = useMutation({
    mutationFn: (item: PlatformNetwork) =>
      setDefaultPublicPool(item.id, { expected_version: item.version }),
    meta: {
      feedback: {
        channel: "notification",
        id: "public-pool-default",
        action: "设置默认公网池",
        successText: "默认公网池已更新",
      },
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: platformNetworkKeys.all("public-address-pools"),
      });
    },
  });
  const disabled = (item: PlatformNetwork) =>
    allocation.isPending || defaultPool.isPending || Boolean(remove.disabled?.(item));
  const defaultDisabled = (item: PlatformNetwork) =>
    disabled(item) || !item.pool || item.pool.is_default;
  const actions: RowAction<PlatformNetwork>[] = [
    {
      key: "default",
      label: (item) => (item.pool?.is_default ? "当前默认" : "设为默认"),
      widthLabel: "设为默认",
      disabled: defaultDisabled,
      loading: (item) => defaultPool.isPending && defaultPool.variables?.id === item.id,
      onClick: (item) => {
        if (defaultDisabled(item)) return;
        Modal.confirm({
          title: "设为默认公网池",
          content: `将「${item.name}」设为默认公网池？后续租户新建 EIP 将使用该地址池。`,
          onOk: () => defaultPool.mutateAsync(item),
        });
      },
    },
    {
      key: "allocation",
      label: (item) => (item.pool?.allocation_enabled ? "关闭分配" : "开启分配"),
      widthLabel: "关闭分配",
      disabled,
      loading: (item) => allocation.isPending && allocation.variables?.item.id === item.id,
      onClick: (item) => {
        if (disabled(item)) return;
        const enabled = !item.pool?.allocation_enabled;
        Modal.confirm({
          title: enabled ? "开启公网池分配" : "关闭公网池分配",
          content: `确定${enabled ? "开启" : "关闭"}「${item.name}」的地址分配？`,
          onOk: () => allocation.mutateAsync({ item, enabled }),
        });
      },
    },
    { ...remove, disabled },
  ];
  return { actions };
}
