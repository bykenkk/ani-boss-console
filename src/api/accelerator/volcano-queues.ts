import { listClusters, listResources, listResourceTypes } from "@/api/cluster-ops";
import { ApiError } from "@/api/request";

export interface GpuVolcanoQueueOption {
  name: string;
  state: string;
  parent: string;
  available: boolean;
  unavailableReason?: string;
}

export interface GpuVolcanoQueueOptions {
  items: GpuVolcanoQueueOption[];
  hasMore: boolean;
}

interface VolcanoQueueObject {
  apiVersion?: string;
  kind?: string;
  metadata?: { name?: string; deletionTimestamp?: string };
  spec?: { parent?: string };
  status?: { state?: string };
}

// Reuse the published cluster-ops cursor API; this is a first-page option view,
// not an invented queue endpoint or a client-side replacement for pagination.
export async function listGpuVolcanoQueueOptions(
  clusterId: string,
  signal?: AbortSignal,
): Promise<GpuVolcanoQueueOptions> {
  const clusters = await listClusters(signal);
  if (!clusters.items.some((cluster) => cluster.cluster_id === clusterId)) {
    throw new ApiError("当前 GPU 集群未配置对应的集群运维连接", {
      reason: "CLUSTER_NOT_CONFIGURED",
    });
  }
  const types = await listResourceTypes(clusterId, signal);
  const queueType = types.items.find(
    (descriptor) =>
      descriptor.type.group === "scheduling.volcano.sh" &&
      descriptor.type.version === "v1beta1" &&
      descriptor.type.resource === "queues" &&
      descriptor.kind === "Queue" &&
      !descriptor.namespaced &&
      descriptor.actions.includes("list"),
  );
  if (!queueType) {
    throw new ApiError("当前集群未发现可读取的 Volcano 队列资源", {
      reason: "RESOURCE_TYPE_UNAVAILABLE",
    });
  }
  const page = await listResources(clusterId, { ...queueType.type, page_size: 100 }, signal);
  const queues = page.items.map((document) => {
    let queue: VolcanoQueueObject;
    try {
      queue = JSON.parse(document.object_json) as VolcanoQueueObject;
    } catch {
      throw new ApiError("Volcano 队列数据无法解析，请刷新后重试");
    }
    if (
      queue?.kind !== "Queue" ||
      queue.apiVersion !== "scheduling.volcano.sh/v1beta1" ||
      typeof queue.metadata?.name !== "string" ||
      !queue.metadata.name ||
      queue.metadata.name !== document.ref.name ||
      document.ref.cluster_id !== clusterId
    ) {
      throw new ApiError("Volcano 队列数据与当前集群不一致，请刷新后重试");
    }
    return {
      name: queue.metadata.name,
      state: typeof queue.status?.state === "string" ? queue.status.state : "Unknown",
      parent: typeof queue.spec?.parent === "string" ? queue.spec.parent : "",
      deleting: Boolean(queue.metadata.deletionTimestamp),
    };
  });
  const parents = new Set(queues.map((queue) => queue.parent).filter(Boolean));
  return {
    // Volcano accepts jobs on Open leaf queues; identify parents from returned
    // relationships rather than assuming a queue is unusable from its name.
    // https://volcano.sh/docs/v1.12.0/keyfeatures/hierarchicalqueue/
    items: queues.map((queue) => {
      const unavailableReason = queue.deleting
        ? "正在删除"
        : parents.has(queue.name)
          ? "父队列"
          : queue.state !== "Open"
            ? queue.state
            : undefined;
      return {
        name: queue.name,
        state: queue.state,
        parent: queue.parent,
        available: unavailableReason === undefined,
        unavailableReason,
      };
    }),
    hasMore: Boolean(page.next_continue_token),
  };
}
