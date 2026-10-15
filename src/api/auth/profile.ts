import { adminRequest } from "@/api/request";
import type { CurrentUser } from "./types";

export const currentUserQueryKey = ["auth", "current-user"] as const;

export function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return adminRequest<CurrentUser>("/me", { method: "GET", signal });
}
