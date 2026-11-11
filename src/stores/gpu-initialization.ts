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

export function setGpuInitializationIntent(connectionRef: string, input?: GpuInitializationInput) {
  gpuInitializationIntents.setState((state) => ({
    creates: { ...state.creates, [connectionRef]: input },
  }));
}

export function setGpuInitializationRetryIntent(
  operationId: string,
  input?: RetryGpuInitializationInput,
) {
  gpuInitializationIntents.setState((state) => ({
    retries: { ...state.retries, [operationId]: input },
  }));
}
