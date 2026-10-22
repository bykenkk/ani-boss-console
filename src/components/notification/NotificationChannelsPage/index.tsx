import { Button, Modal } from "@arco-design/web-react";
import { IconPlus } from "@arco-design/web-react/icon";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  deleteNotificationChannel,
  listNotificationChannels,
  notificationChannelKeys,
  type NotificationChannel,
} from "@/api/notification-channels";
import { ListDataTable, ListPageFrame, type RowAction } from "@/components/common";
import { useListPagination } from "@/hooks/useListPagination";
import { NotificationChannelEditModal } from "../NotificationChannelEditModal";
import { NotificationChannelTestEmailModal } from "../NotificationChannelTestEmailModal";
import { notificationChannelColumns } from "./model";

export function NotificationChannelsPage() {
  const pagination = useListPagination("notification-channels");
  const [editing, setEditing] = useState<number | "create">();
  const [testTarget, setTestTarget] = useState<NotificationChannel>();
  const client = useQueryClient();
  const params = { page: pagination.page, pageSize: pagination.pageSize };
  const query = useQuery({
    queryKey: notificationChannelKeys.list(params),
    queryFn: ({ signal }) => listNotificationChannels(params, signal),
    meta: { errorNotification: { id: "notification-channel-list", action: "通知渠道加载" } },
  });
  const removal = useMutation({
    mutationFn: deleteNotificationChannel,
    meta: {
      feedback: {
        channel: "notification",
        id: "notification-channel-delete",
        action: "删除通知渠道",
      },
    },
    onSuccess: async () => {
      if (query.data?.items.length === 1 && pagination.page > 1)
        pagination.setPage(pagination.page - 1);
      await client.invalidateQueries({ queryKey: notificationChannelKeys.all });
    },
  });
  const rowActions: RowAction<NotificationChannel>[] = [
    {
      key: "edit",
      label: "编辑",
      disabled: (row) => row.id === undefined,
      onClick: (row) => setEditing(row.id),
    },
    {
      key: "test",
      label: "测试发送",
      visible: (row) => row.type === "EMAIL",
      disabled: (row) => row.id === undefined || !row.enabled,
      tooltip: (row) => (!row.enabled ? "请先启用渠道" : undefined),
      onClick: setTestTarget,
    },
    {
      key: "delete",
      label: "删除",
      intent: "danger",
      disabled: (row) => row.id === undefined,
      loading: (row) => removal.isPending && removal.variables === row.id,
      onClick: (row) => {
        if (row.id === undefined) return;
        const id = row.id;
        Modal.confirm({
          title: "删除通知渠道",
          content: "确认删除“" + (row.name ?? id) + "”？使用此渠道的通知将无法通过该渠道发送。",
          onOk: () => removal.mutateAsync(id),
        });
      },
    },
  ];
  return (
    <>
      <ListPageFrame
        header={{ title: "通知渠道", subtitle: "管理全平台共享的通知渠道与邮件发送配置。" }}
        toolbar={{
          actions: (
            <Button type="primary" icon={<IconPlus />} onClick={() => setEditing("create")}>
              新建通知渠道
            </Button>
          ),
          refresh: {
            spinning: query.isFetching,
            onClick: () => {
              query.refetch();
            },
          },
        }}
      >
        <ListDataTable
          rowKey="id"
          tableLabel="通知渠道"
          columns={notificationChannelColumns}
          data={query.data?.items ?? []}
          loading={query.isFetching}
          emptyText="暂无通知渠道"
          rowActions={rowActions}
          pagination={{
            page: pagination.page,
            pageSize: pagination.pageSize,
            total: Number(query.data?.total ?? "0"),
            pageSizeOptions: [20, 50, 100],
            disabled: query.isFetching,
            onPageChange: pagination.setPage,
            onPageSizeChange: pagination.setPageSize,
          }}
        />
      </ListPageFrame>
      {editing !== undefined && (
        <NotificationChannelEditModal
          channelId={editing === "create" ? undefined : editing}
          onCancel={() => setEditing(undefined)}
          onSuccess={() => setEditing(undefined)}
        />
      )}
      {testTarget?.id !== undefined && (
        <NotificationChannelTestEmailModal
          channelId={testTarget.id}
          channelName={testTarget.name ?? String(testTarget.id)}
          onCancel={() => setTestTarget(undefined)}
        />
      )}
    </>
  );
}
