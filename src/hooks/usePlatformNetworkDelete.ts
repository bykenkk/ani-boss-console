import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deletePlatformNetwork,
  platformNetworkKeys,
  type PlatformNetwork,
  type PlatformNetworkKind,
} from "@/api/platform-networks";
import type { RowAction } from "@/components/common";
export function usePlatformNetworkDelete(kind: PlatformNetworkKind, onDeleted: () => void) {
  const queryClient = useQueryClient();
  const title = kind === "vlan-networks" ? "删除二层网络" : "删除公有网络";
  const remove = useMutation({
    mutationFn: (item: PlatformNetwork) => deletePlatformNetwork(kind, item.id),
    meta: {
      feedback: {
        channel: "notification",
        id: `${kind}-delete`,
        action: title,
        successText: "删除已提交",
      },
    },
    onSuccess: async () => {
      // TODO(underlay-task): 资源创建、删除的任务跟踪后续统一接入。
      await queryClient.invalidateQueries({ queryKey: platformNetworkKeys.all(kind) });
      onDeleted();
    },
  });
  const disabled = (item: PlatformNetwork) =>
    remove.isPending || item.state === "deleting" || item.state === "deleted";
  const action: RowAction<PlatformNetwork> = {
    key: "delete",
    label: "删除",
    intent: "danger",
    disabled,
    loading: (item) => remove.isPending && remove.variables?.id === item.id,
    onClick: (item) => {
      if (disabled(item)) return;
      Modal.confirm({
        title,
        content: `确定删除「${item.name}」？删除后不可恢复。`,
        okButtonProps: { status: "danger" },
        onOk: () => remove.mutateAsync(item),
      });
    },
  };
  return action;
}
