import { gpuScopeKey, type GpuOperationScope } from "@/api/accelerator/scope";
import { createStore } from "zustand/vanilla";
import type { GpuInitializationInput, RetryGpuInitializationInput } from "@/api/accelerator";

interface GpuInitializationIntents {
  creates: Record<string, GpuInitializationInput | undefined>;
  retries: Record<string, RetryGpuInitializationInput | undefined>;
}

// 只保留结果尚未确认的原提交；跨弹窗重挂载复用，刷新浏览器后通过初始化状态查找后台任务。
// 幂等键仅由 API 作用域管理，不存入客户端 store，也不持久化凭据或表单。
export const gpuInitializationIntents = createStore<GpuInitializationIntents>(() => ({
  creates: {},
  retries: {},
}));

export function setGpuInitializationIntent(
  scope: GpuOperationScope,
  input?: GpuInitializationInput,
) {
  gpuInitializationIntents.setState((state) => ({
    creates: { ...state.creates, [gpuScopeKey(scope)]: input },
  }));
}

export function setGpuInitializationRetryIntent(
  scope: GpuOperationScope,
  operationId: string,
  input?: RetryGpuInitializationInput,
) {
  gpuInitializationIntents.setState((state) => ({
    retries: {
      ...state.retries,
      [`${gpuScopeKey(scope)}:${encodeURIComponent(operationId)}`]: input,
    },
  }));
}
