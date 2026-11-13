import { Descriptions, Drawer, Skeleton } from "@arco-design/web-react";
import { useQuery } from "@tanstack/react-query";
import { imageKeys, type ImageTarget } from "@/api/container-images";
import { ResourceIdentity } from "@/components/common";
import { withId } from "@/lib/id";
import { imageOperations } from "../operations";
import { imageQueryOptions, imageTime, acceleratorLabels, purposeLabels } from "../model";
interface ImageDetailDrawerProps {
  target: ImageTarget;
  imageId: string;
  onClose: () => void;
}
export function ImageDetailDrawer({ target, imageId, onClose }: ImageDetailDrawerProps) {
  const api = imageOperations(target);
  const query = useQuery({
    ...imageQueryOptions,
    queryKey: imageKeys.detail(target, imageId),
    queryFn: ({ signal }) => api.detail(imageId, signal),
    meta: {
      errorNotification: {
        id: withId("image-detail", ...imageKeys.target(target), imageId),
        action: "镜像详情加载",
      },
    },
  });
  const image = query.data;
  return (
    <Drawer visible title="镜像详情" width={680} footer={null} onCancel={onClose}>
      <Skeleton loading={query.isPending}>
        <Descriptions
          column={1}
          valueStyle={{ wordBreak: "break-all" }}
          data={[
            { label: "名称", value: image?.displayName ?? "-" },
            {
              label: "镜像 ID",
              value: <ResourceIdentity id={imageId} idLabel="镜像 ID" display="id" />,
            },
            {
              label: "所属范围",
              value: target.scope === "platform" ? "平台" : `租户 ${target.tenantId}`,
            },
            {
              label: "空间 ID",
              value: <ResourceIdentity id={image?.spaceId} idLabel="空间 ID" display="id" />,
            },
            { label: "描述", value: image?.description || "-" },
            { label: "仓库", value: image?.repository ?? "-" },
            { label: "源镜像地址", value: image?.sourceReference ?? "-" },
            { label: "镜像地址（Digest）", value: image?.resolvedReference ?? "-" },
            { label: "Digest", value: image?.digest ?? "-" },
            {
              label: "平台架构",
              value:
                image?.platforms
                  .map((item) =>
                    [item.os, item.architecture, item.variant].filter(Boolean).join("/"),
                  )
                  .join("、") || "-",
            },
            {
              label: "用途",
              value: image?.purposes.map((value) => purposeLabels[value]).join("、") ?? "-",
            },
            { label: "加速器", value: image ? acceleratorLabels[image.accelerator] : "-" },
            { label: "版本", value: image?.version ?? "-" },
            { label: "创建时间", value: imageTime(image?.createdAt) },
            { label: "更新时间", value: imageTime(image?.updatedAt) },
            { label: "移除时间", value: imageTime(image?.unregisteredAt) },
          ]}
        />
      </Skeleton>
    </Drawer>
  );
}
