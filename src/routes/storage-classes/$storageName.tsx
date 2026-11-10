import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { StorageClassDetailPage } from "@/components/cluster-ops/StorageClassDetailPage";
import { storageDefinitions } from "@/components/cluster-ops/ClusterStoragePage/constants";
import { validateStorageDetailSearch } from "@/components/cluster-ops/ClusterStoragePage/search";

export const Route = createFileRoute("/storage-classes/$storageName")({
  validateSearch: validateStorageDetailSearch,
  component: function StorageClassDetailRoute() {
    const { storageName } = Route.useParams();
    const { cluster_id, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: storageDefinitions.classes.type,
        namespace: "",
        name: storageName,
      }),
      [cluster_id, storageName],
    );
    const onList = () => navigate({ to: "/storage-classes", search: { cluster_id, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <StorageClassDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从存储类列表重新进入。</p>,
});
