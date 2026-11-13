import { useQuery } from "@tanstack/react-query";
import { getPlatformImageSpace, imageKeys } from "@/api/container-images";
import { withId } from "@/lib/id";
import { imageQueryOptions } from "../model";
import { ImageWorkspace } from "../ImageWorkspace";
const target = { scope: "platform" } as const;
export function PlatformImages() {
  const query = useQuery({
    ...imageQueryOptions,
    queryKey: imageKeys.space(target),
    queryFn: ({ signal }) => getPlatformImageSpace(signal),
    meta: { errorNotification: { id: withId("image-space", "platform"), action: "镜像空间加载" } },
  });
  return (
    <ImageWorkspace
      target={target}
      space={query.data?.space}
      bindingStatus={query.data?.bindingStatus}
      configuredProject={query.data?.configuredProject}
      configuredAuthority={query.data?.configuredRegistryAuthority}
      loading={query.isPending}
      ready={query.isSuccess}
    />
  );
}
