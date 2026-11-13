import { useQuery } from "@tanstack/react-query";
import { getTenantImageSpace, imageKeys, type ImageTarget } from "@/api/container-images";
import { withId } from "@/lib/id";
import { imageQueryOptions } from "../model";
import { ImageWorkspace } from "../ImageWorkspace";
interface ManagedTenantImagesProps {
  tenantId: number;
}
export function ManagedTenantImages({ tenantId }: ManagedTenantImagesProps) {
  const target: ImageTarget = { scope: "tenant", tenantId };
  const query = useQuery({
    ...imageQueryOptions,
    queryKey: imageKeys.space(target),
    queryFn: ({ signal }) => getTenantImageSpace(tenantId, signal),
    meta: {
      errorNotification: {
        id: withId("image-space", "tenant", tenantId),
        action: "租户镜像空间加载",
      },
    },
  });
  return (
    <ImageWorkspace
      target={target}
      space={query.data}
      bindingStatus={query.isSuccess ? (query.data?.state ?? "uninitialized") : undefined}
      loading={query.isPending}
      ready={query.isSuccess}
    />
  );
}
