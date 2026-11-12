import type { GpuVolcanoQueueOptions } from "@/api/accelerator/volcano-queues";

// Keep an available user choice across refreshes. Defaults must come from the
// loaded cluster objects; an incomplete page cannot establish a unique queue.
export function chooseInitializationQueue(
  current: string,
  options: GpuVolcanoQueueOptions,
): string {
  const available = options.items.filter((queue) => queue.available);
  if (available.some((queue) => queue.name === current)) return current;
  return (
    available.find((queue) => queue.name === "default")?.name ??
    (!options.hasMore && available.length === 1 ? available[0].name : "")
  );
}
