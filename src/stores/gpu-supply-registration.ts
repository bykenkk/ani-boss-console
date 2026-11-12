import { createStore } from "zustand/vanilla";
import { persist } from "zustand/middleware";
import type {
  GpuSupplyRegistrationResult,
  RegisterGpuSupplyConfigurationInput,
} from "@/api/accelerator";

// 结果未确认时跨弹窗保留原始提交，幂等键仍由公共 API 作用域管理。
interface GpuSupplyRegistrationState {
  inputs: Record<string, RegisterGpuSupplyConfigurationInput | undefined>;
  registrations: Record<string, Record<string, string>>;
}

export const gpuSupplyRegistrationIntents = createStore<GpuSupplyRegistrationState>()(
  persist(() => ({ inputs: {}, registrations: {} }), {
    name: "ani-boss-gpu-supply-registration-references",
    version: 1,
    // References only: facts are re-read from the authenticated GET. Unconfirmed
    // form bodies and idempotency keys are never persisted here.
    partialize: (state) => ({ registrations: state.registrations }),
  }),
);

// Only server-issued references are retained across modal remounts. The actual
// approved parameters are still read from the registration GET, never rebuilt.
export function rememberGpuSupplyRegistration(registration: GpuSupplyRegistrationResult) {
  gpuSupplyRegistrationIntents.setState((state) => ({
    registrations: {
      ...state.registrations,
      [registration.connection_ref]: {
        ...state.registrations[registration.connection_ref],
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
  connectionRef: string,
  input?: RegisterGpuSupplyConfigurationInput,
) {
  gpuSupplyRegistrationIntents.setState((state) => ({
    inputs: { ...state.inputs, [connectionRef]: input },
  }));
}
