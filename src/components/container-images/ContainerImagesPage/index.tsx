import { ResourcePageFrame } from "@/components/common";
import { PlatformImages } from "../PlatformImages";

export function ContainerImagesPage() {
  return (
    <ResourcePageFrame
      header={{ title: "容器镜像", subtitle: "管理平台镜像、镜像空间和推送凭证。" }}
    >
      <PlatformImages />
    </ResourcePageFrame>
  );
}
