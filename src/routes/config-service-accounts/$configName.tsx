import { useMemo } from "react";
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { ServiceAccountDetailPage } from "@/components/cluster-ops/ServiceAccountDetailPage";
import { configDefinitions } from "@/components/cluster-ops/ClusterConfigPage/constants";
import { validateConfigDetailSearch } from "@/components/cluster-ops/ClusterConfigPage/search";

export const Route = createFileRoute("/config-service-accounts/$configName")({
  validateSearch: validateConfigDetailSearch,
  component: function ServiceAccountDetailRoute() {
    const { configName } = Route.useParams();
    const { cluster_id, namespace, page_size } = Route.useSearch();
    const navigate = Route.useNavigate();
    const router = useRouter();
    const canGoBack = useCanGoBack();
    const resourceRef = useMemo(
      () => ({
        cluster_id,
        type: configDefinitions.serviceaccounts.type,
        namespace: namespace,
        name: configName,
      }),
      [cluster_id, namespace, configName],
    );
    const onList = () =>
      navigate({ to: "/config-service-accounts", search: { cluster_id, namespace, page_size } });
    const onBack = () => {
      if (canGoBack) router.history.back();
      else onList();
    };
    return (
      <ServiceAccountDetailPage
        key={JSON.stringify(resourceRef)}
        resourceRef={resourceRef}
        onBack={onBack}
        onList={onList}
      />
    );
  },
  errorComponent: () => <p>资源定位参数无效，请从服务账户列表重新进入。</p>,
});
