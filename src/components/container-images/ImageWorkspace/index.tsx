import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { imageKeys, type ImageTarget, type ImageSpace } from "@/api/container-images";
import { ManageImageSpaceModal } from "../ManageImageSpaceModal";
import { ImageRegistrations } from "../ImageRegistrations";
interface ImageWorkspaceProps {
  target: ImageTarget;
  space?: ImageSpace | null;
  bindingStatus?: string;
  configuredProject?: string;
  configuredAuthority?: string;
  loading: boolean;
  ready: boolean;
}
export function ImageWorkspace({
  target,
  space,
  bindingStatus,
  configuredProject,
  configuredAuthority,
  loading,
  ready,
}: ImageWorkspaceProps) {
  const [managing, setManaging] = useState(false);
  const client = useQueryClient();
  const refresh = async () => {
    await client.invalidateQueries({ queryKey: imageKeys.target(target) });
  };
  const writable = bindingStatus === "ready" || bindingStatus === "available";
  return (
    <>
      <ImageRegistrations
        target={target}
        enabled={!!space}
        writable={writable}
        onManage={() => setManaging(true)}
      />
      {managing && (
        <ManageImageSpaceModal
          target={target}
          space={space}
          bindingStatus={bindingStatus}
          configuredProject={configuredProject}
          configuredAuthority={configuredAuthority}
          loading={loading}
          ready={ready}
          onChanged={refresh}
          onCancel={() => setManaging(false)}
        />
      )}
    </>
  );
}
