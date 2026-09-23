import { useStore } from "zustand";
import { authStore } from "@/stores/auth";

export function useAuthState() {
  return useStore(authStore);
}
