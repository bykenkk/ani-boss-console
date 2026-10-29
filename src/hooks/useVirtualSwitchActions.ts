import { Modal } from "@arco-design/web-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteVirtualSwitch, virtualSwitchKeys, type VirtualSwitch } from "@/api/virtual-switches";
import type { RowAction } from "@/components/common";

export function useVirtualSwitchActions(onDeleted?: (item: VirtualSwitch) => void | Promise<void>) {
  const queryClient = useQueryClient();
  const remove = useMutation({
    mutationFn: (item: VirtualSwitch) => deleteVirtualSwitch(item.id),
    meta: {
      feedback: {
        channel: "notification",
        id: "virtual-switch-delete",
        action: "删除虚拟交换机",
        successText: "删除已提交",
      },
    },
    onSuccess: async (_, item) => {
      // TODO(virtual-switch-task): 后续接入删除任务跟踪，当前仅刷新资源列表。
      await queryClient.invalidateQueries({ queryKey: virtualSwitchKeys.all });
      await onDeleted?.(item);
    },
  });

  const isDeleteDisabled = (item: VirtualSwitch) =>
    remove.isPending || item.state === "deleting" || item.state === "deleted";

  const confirmDelete = (item: VirtualSwitch) => {
    if (isDeleteDisabled(item)) return;
    Modal.confirm({
      title: "删除虚拟交换机",
      content: `确定删除虚拟交换机「${item.name}」？删除后不可恢复。`,
      okButtonProps: { status: "danger" },
      onOk: () => remove.mutateAsync(item),
    });
  };

  const actions: RowAction<VirtualSwitch>[] = [
    // TODO(virtual-switch-edit): 后端提供修改契约后接入。
    {
      key: "edit",
      label: "修改",
      disabled: () => true,
      tooltip: "暂未提供修改接口",
      onClick: () => undefined,
    },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      disabled: isDeleteDisabled,
      loading: (item) => remove.isPending && remove.variables?.id === item.id,
      onClick: confirmDelete,
    },
  ];

  return { actions };
}
