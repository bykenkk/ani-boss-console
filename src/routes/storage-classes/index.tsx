import { useCallback } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { ClusterStoragePage } from "@/components/cluster-ops/ClusterStoragePage";
import {
  validateStorageSearch,
  type ClusterStorageSearch,
} from "@/components/cluster-ops/ClusterStoragePage/search";

export const Route = createFileRoute("/storage-classes/")({
  validateSearch: validateStorageSearch,
  component: function StorageClassListRoute() {
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
        kind="classes"
        search={search}
        onSearchChange={onSearchChange}
        onOpen={(ref) =>
          navigate({
            to: "/storage-classes/$storageName",
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
  errorComponent: () => <p>筛选参数无效，请从存储类菜单重新进入。</p>,
});
