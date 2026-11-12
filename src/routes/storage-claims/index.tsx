import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterStoragePage } from "@/components/cluster-ops/ClusterStoragePage";
import {
  validateStorageSearch,
  type ClusterStorageSearch,
} from "@/components/cluster-ops/ClusterStoragePage/search";

export const Route = createFileRoute("/storage-claims/")({
  validateSearch: validateStorageSearch,
  component: function PersistentVolumeClaimListRoute() {
    const search = Route.useSearch();
    const navigate = Route.useNavigate();
    const onSearchChange = useCallback(
      (value: ClusterStorageSearch) => {
        navigate({ search: value, replace: true });
      },
      [navigate],
    );
    return (
      <ClusterStoragePage
        kind="claims"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/storage-claims/$storageName",
            params: { storageName: ref.name },
            search: {
              cluster_id: ref.cluster_id,
              namespace: ref.namespace ?? "",
              page_size: search.page_size,
            },
          })
        }
      />
    );
  },
  errorComponent: () => <p>筛选参数无效，请从持久卷声明菜单重新进入。</p>,
});
