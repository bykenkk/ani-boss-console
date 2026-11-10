import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { ConfigMapDetailPage } from "@/components/cluster-ops/ConfigMapDetailPage";
import { configDefinitions } from "@/components/cluster-ops/ClusterConfigPage/constants";
import { validateConfigDetailSearch } from "@/components/cluster-ops/ClusterConfigPage/search";

export const Route = createFileRoute("/config-maps/$configName")({
  validateSearch: validateConfigDetailSearch,
  component: function ConfigMapDetailRoute() {
    const { configName } = Route.useParams();
    const { cluster_id, namespace, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: configDefinitions.configmaps.type,
        namespace: namespace,
        name: configName,
      }),
      [cluster_id, namespace, configName],
    );
    const onList = () =>
      navigate({ to: "/config-maps", search: { cluster_id, namespace, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <ConfigMapDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从配置字典列表重新进入。</p>,
});
