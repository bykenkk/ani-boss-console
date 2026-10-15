import { useQuery } from "@tanstack/react-query";
import { currentUserQueryKey, fetchCurrentUser } from "@/api/auth";
import { useAuthState } from "./useAuthState";

export function useCurrentUser() {
  const { tokens } = useAuthState();

  return useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    enabled: Boolean(tokens?.access_token),
    meta: {
      errorNotification: {
        id: "current-user",
        action: "当前用户信息加载",
        fallback: "当前用户信息加载失败",
      },
    },
  });
}
