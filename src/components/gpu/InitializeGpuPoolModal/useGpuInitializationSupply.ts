import { gpuScopeKey, type GpuOperationScope } from "@/api/accelerator/scope";
import { useId, useMemo } from "react";
import {
  useInfiniteQuery,
  useQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { useStore } from "zustand";
import {
  acceleratorKeys,
  listGpuSupplyCandidates,
  getGpuSupplyRegistration,
  type GpuAllocationType,
  type GpuDiscoveredNode,
  type GpuProviderConfig,
  type GpuRegisteredSupplyConfiguration,
  type GpuSupplyCandidates,
} from "@/api/accelerator";
import { ApiError } from "@/api/request";
import { withId } from "@/lib/id";
import { gpuSupplyRegistrationIntents } from "@/stores/gpu-supply-registration";
import { resolveGpuInitializationSupply } from "./supply-facts";

export function useGpuInitializationSupply({
  scope,
  connectionRef,
  nodes,
  config,
  allocationType,
  selectedResourceKey,
  registration,
  discoveryRevision,
  enabled,
}: {
  scope: GpuOperationScope;
  connectionRef: string;
  nodes: GpuDiscoveredNode[];
  config?: GpuProviderConfig;
  allocationType?: GpuAllocationType;
  selectedResourceKey: string;
  registration?: GpuRegisteredSupplyConfiguration;
  discoveryRevision: string;
  enabled: boolean;
}) {
  const client = useQueryClient();
  const lookupInstance = useId();
  const registrationId = useStore(gpuSupplyRegistrationIntents, (state) =>
    config ? state.registrations[gpuScopeKey(scope)]?.[config.provider_config_ref] : undefined,
  );
  const receipt = useQuery({
    queryKey: [...acceleratorKeys.all, "supply-registration", gpuScopeKey(scope), registrationId],
    queryFn: ({ signal }) => getGpuSupplyRegistration(registrationId!, signal),
    enabled: enabled && Boolean(registrationId) && !registration,
    meta: {
      errorNotification: {
        id: withId("gpu-supply-registration", connectionRef),
        action: "GPU 供给登记结果查询",
      },
    },
  });
  const approved =
    registration ??
    receipt.data?.configurations.find(
      (item) =>
        item.connection_ref === connectionRef &&
        item.provider_config_ref === config?.provider_config_ref,
    );
  const waitingReceipt =
    enabled && Boolean(registrationId) && !approved && (receipt.isPending || receipt.isFetching);
  const receiptError =
    enabled && Boolean(registrationId) && !approved && receipt.isError ? receipt.error : undefined;
  const needsQuery =
    enabled &&
    !approved &&
    !waitingReceipt &&
    !receiptError &&
    Boolean(config && allocationType && nodes.length);
  const pageSize = 100;
  const queryKey = [
    ...acceleratorKeys.all,
    "initialization-supply-facts",
    lookupInstance,
    gpuScopeKey(scope),
    discoveryRevision,
    config?.provider_config_ref,
    allocationType,
    nodes.map((node) => node.node?.uid).sort(),
  ] as const;
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: 1,
    queryFn: async ({ signal, pageParam }): Promise<GpuSupplyCandidates> => {
      const page = await listGpuSupplyCandidates(
        { connection_ref: connectionRef, page: pageParam, pageSize },
        signal,
      );
      const first =
        client.getQueryData<InfiniteData<GpuSupplyCandidates, number>>(queryKey)?.pages[0];
      if (pageParam > 1 && first && first.discovery_revision !== page.discovery_revision) {
        throw new ApiError("供给事实在分页查询期间已变化，请刷新供给信息后重新查询", {
          reason: "SUPPLY_FACTS_CHANGED",
        });
      }
      return page;
    },
    getNextPageParam: (page, _pages, pageParam) =>
      pageParam * pageSize < Number(page.total) ? pageParam + 1 : undefined,
    enabled: needsQuery,
    // Explicit on-demand lookup: later pages load only on the user's action,
    // and a new initialization snapshot creates a new query key.
    staleTime: Infinity,
    refetchOnMount: false,
    meta: {
      errorNotification: {
        id: withId("gpu-initialization-supply-facts", connectionRef),
        action: "GPU 初始化供给事实查询",
      },
    },
  });
  const facts = useMemo(
    () =>
      resolveGpuInitializationSupply({
        nodes,
        config,
        allocationType,
        selectedResourceKey,
        registration: approved,
        candidatePages: query.data?.pages,
        loading: waitingReceipt || (needsQuery && (query.isPending || query.isFetching)),
        error: receiptError ?? (needsQuery && query.isError ? query.error : undefined),
      }),
    [
      nodes,
      config,
      allocationType,
      selectedResourceKey,
      approved,
      query.data,
      needsQuery,
      waitingReceipt,
      receiptError,
      query.isPending,
      query.isFetching,
      query.isError,
      query.error,
    ],
  );
  const refresh = async () => {
    if (registrationId) return receipt.refetch({ throwOnError: true });
    await client.cancelQueries({ queryKey, exact: true });
    client.setQueryData<InfiniteData<GpuSupplyCandidates, number>>(queryKey, (data) =>
      data ? { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) } : data,
    );
    return query.refetch({ throwOnError: true });
  };
  const loadMore = async () => {
    if (needsQuery && query.hasNextPage && !query.isFetching)
      await query.fetchNextPage({ throwOnError: true });
  };
  return { facts, refresh, loadMore };
}
