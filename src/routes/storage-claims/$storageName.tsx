import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { PersistentVolumeClaimDetailPage } from "@/components/cluster-ops/PersistentVolumeClaimDetailPage";
import { storageDefinitions } from "@/components/cluster-ops/ClusterStoragePage/constants";
import { validateStorageDetailSearch } from "@/components/cluster-ops/ClusterStoragePage/search";

export const Route = createFileRoute("/storage-claims/$storageName")({
  validateSearch: validateStorageDetailSearch,
  component: function PersistentVolumeClaimDetailRoute() {
    const { storageName } = Route.useParams();
    const { cluster_id, namespace, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: storageDefinitions.claims.type,
        namespace: namespace,
        name: storageName,
      }),
      [cluster_id, namespace, storageName],
    );
    const onList = () =>
      navigate({ to: "/storage-claims", search: { cluster_id, namespace, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <PersistentVolumeClaimDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从持久卷声明列表重新进入。</p>,
});
