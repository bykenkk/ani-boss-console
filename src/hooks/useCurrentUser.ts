import { useQuery } from "@tanstack/react-query";
import { currentUserQueryKey, fetchCurrentUser } from "@/api/auth";
import { useStore } from "zustand";
import { authStore } from "@/stores/auth";

export function useCurrentUser() {
  const isAuthenticated = useStore(authStore, (state) => Boolean(state.tokens?.access_token));

  const query = useQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    enabled: isAuthenticated,
    meta: {
      errorNotification: {
        id: "current-user",
        action: "当前用户信息加载",
        fallback: "当前用户信息加载失败",
      },
    },
  });

  const user = isAuthenticated ? query.data : undefined;

  return {
    user,
    isPending: query.isPending,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
