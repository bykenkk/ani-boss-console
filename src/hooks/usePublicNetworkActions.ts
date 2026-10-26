import { usePlatformNetworkDelete } from "./usePlatformNetworkDelete";
import { useState } from "react";
import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  platformNetworkKeys,
  setPublicPoolAllocation,
  type PlatformNetwork,
} from "@/api/platform-networks";
import type { RowAction } from "@/components/common";
export function usePublicNetworkActions(onDeleted: () => void) {
  const remove = usePlatformNetworkDelete("public-address-pools", onDeleted);
  const [verification, setVerification] = useState<PlatformNetwork>();
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
  const disabled = (item: PlatformNetwork) =>
    allocation.isPending || Boolean(remove.disabled?.(item));
  const actions: RowAction<PlatformNetwork>[] = [
    { key: "verification", label: "记录验证", disabled, onClick: setVerification },
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
  return { actions, verification, closeVerification: () => setVerification(undefined) };
}
