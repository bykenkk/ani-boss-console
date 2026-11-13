import { Alert, Modal, Typography } from "@arco-design/web-react";
import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/request";
import { imageKeys, type ImageTarget, type ImageRegistration } from "@/api/container-images";
import { withId } from "@/lib/id";
import { imageOperations } from "../operations";
import { imageQueryOptions } from "../model";
import { VersionConflictNotice } from "../VersionConflictNotice";
interface UnregisterImageModalProps {
  target: ImageTarget;
  image: ImageRegistration;
  onCancel: () => void;
  onSuccess: () => Promise<unknown>;
}
export function UnregisterImageModal({
  target,
  image,
  onCancel,
  onSuccess,
}: UnregisterImageModalProps) {
  const [version, setVersion] = useState(image.version);
  const [latest, setLatest] = useState<ImageRegistration>();
  const [conflict, setConflict] = useState(false);
  const api = imageOperations(target);
  const detail = useQuery({
    ...imageQueryOptions,
    queryKey: imageKeys.detail(target, image.image_id),
    queryFn: ({ signal }) => api.detail(image.image_id, signal),
    meta: {
      errorNotification: {
        id: withId("image-detail", ...imageKeys.target(target), image.image_id),
        action: "镜像详情加载",
      },
    },
  });
  const mutation = useMutation({
    gcTime: 0,
    retry: false,
    mutationFn: async () => {
      await api.unregister(image.image_id, { expectedVersion: version });
      await onSuccess();
    },
    onError: async (error) => {
      if (error instanceof ApiError && error.reason === "VERSION_CONFLICT") {
        setConflict(true);
        const refreshed = await detail.refetch();
        setLatest(refreshed.isSuccess ? refreshed.data : undefined);
      }
    },
    meta: {
      feedback: {
        channel: "notification",
        id: withId("image-unregister", ...imageKeys.target(target), image.image_id),
        action: "移除镜像",
        successText: "镜像已移除",
      },
    },
  });
  const submit = async () => {
    try {
      await mutation.mutateAsync();
    } catch {
      /* 统一 mutation 反馈。 */
    }
  };
  return (
    <Modal
      visible
      title="移除镜像"
      onCancel={onCancel}
      onOk={submit}
      confirmLoading={mutation.isPending}
      okText="确认移除"
      okButtonProps={{ status: "danger", disabled: conflict || !detail.data }}
    >
      <div className="flex flex-col gap-4">
        <Alert
          type="warning"
          content="仅移除平台中的镜像记录，不删除 Harbor 中的镜像，也不影响运行中的实例。"
        />
        <Typography.Text>确认移除“{image.displayName}”？</Typography.Text>
        {conflict && (
          <VersionConflictNotice
            disabled={!latest}
            onAdopt={() => {
              if (!latest) return;
              setVersion(latest.version);
              setLatest(undefined);
              setConflict(false);
            }}
          />
        )}
      </div>
    </Modal>
  );
}
