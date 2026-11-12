import type { RegisterSupplyConfigurationInput } from "@/api/accelerator/types-group-policy";
import {
  gpuScopeKey,
  requireGpuSupplyTarget,
  type GpuOperationScope,
} from "@/api/accelerator/scope";
import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import type { RegisterGpuSupplyConfigurationInput } from "@/api/accelerator";

// 结果未确认时跨弹窗保留原始提交，幂等键仍由公共 API 作用域管理。
interface GpuSupplyRegistrationState {
  policyInputs: Record<string, RegisterSupplyConfigurationInput | undefined>;
  inputs: Record<string, RegisterGpuSupplyConfigurationInput | undefined>;
  registrations: Record<string, Record<string, string>>;
}

export const gpuSupplyRegistrationIntents = createStore<GpuSupplyRegistrationState>()(
  persist(() => ({ inputs: {}, policyInputs: {}, registrations: {} }), {
    name: "ani-boss-gpu-supply-registration-references-v2",
    version: 2,
    // References only: facts are re-read from the authenticated GET. Unconfirmed
    // form bodies and idempotency keys are never persisted here.
    partialize: (state) => ({ registrations: state.registrations }),
  }),
);

// Only server-issued references are retained across modal remounts. The actual
// approved parameters are still read from the registration GET, never rebuilt.
export function rememberGpuSupplyRegistration(
  registration: {
    registration_id: string;
    connection_ref: string;
    configurations: Array<{
      provider_config_ref: string;
      connection_ref?: string;
      cluster_id?: string;
    }>;
  },
  scope: GpuOperationScope,
) {
  requireGpuSupplyTarget(registration, scope);
  for (const configuration of registration.configurations) {
    if (configuration.connection_ref !== undefined)
      requireGpuSupplyTarget(
        { ...configuration, connection_ref: configuration.connection_ref },
        scope,
      );
  }
  gpuSupplyRegistrationIntents.setState((state) => ({
    registrations: {
      ...state.registrations,
      [gpuScopeKey(scope)]: {
        ...state.registrations[gpuScopeKey(scope)],
        ...Object.fromEntries(
          registration.configurations.map((configuration) => [
            configuration.provider_config_ref,
            registration.registration_id,
          ]),
        ),
      },
    },
  }));
}

export function setGpuSupplyRegistrationIntent(
  scope: GpuOperationScope,
  input?: RegisterGpuSupplyConfigurationInput,
) {
  gpuSupplyRegistrationIntents.setState((state) => ({
    inputs: { ...state.inputs, [gpuScopeKey(scope)]: input },
  }));
}

export function setGpuPolicySupplyRegistrationIntent(
  scope: GpuOperationScope,
  input?: RegisterSupplyConfigurationInput,
) {
  gpuSupplyRegistrationIntents.setState((state) => ({
    policyInputs: { ...state.policyInputs, [gpuScopeKey(scope)]: input },
  }));
}
