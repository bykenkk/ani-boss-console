import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { eipKeys, releaseEIP, type EIP } from "@/api/eips";
import { eipReleaseBlockReason } from "@/components/eip/model";
import type { RowAction } from "@/components/common";

export function useEIPActions(onReleased: () => void) {
  const queryClient = useQueryClient();
  const release = useMutation({
    mutationFn: (item: EIP) => releaseEIP(item.id),
    meta: {
      feedback: {
        channel: "notification",
        id: "eip-release",
        action: "释放 EIP",
        successText: "释放已提交",
      },
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: eipKeys.all });
      onReleased();
    },
  });
  const disabled = (item: EIP) => release.isPending || Boolean(eipReleaseBlockReason(item));
  const actions: RowAction<EIP>[] = [
    {
      key: "release",
      label: "释放",
      intent: "danger",
      disabled,
      tooltip: eipReleaseBlockReason,
      loading: (item) => release.isPending && release.variables?.id === item.id,
      onClick: (item) => {
        if (disabled(item)) return;
        Modal.confirm({
          title: "释放 EIP",
          content: `确定释放「${item.name}」${item.address ? `（${item.address}）` : ""}？地址回收后将不可继续使用。`,
          okButtonProps: { status: "danger" },
          onOk: () => release.mutateAsync(item),
        });
        // TODO(task-integration): 统一任务跟踪接入后展示异步释放进度；当前通过刷新查看资源状态。
      },
    },
  ];
  return { actions };
}
