import "@arco-design/web-react/dist/css/arco.css";
import "@/assets/iconfont/iconfont.css";
import "@/styles/tailwind.css";
import "@/styles/global.less";
import { ConfigProvider } from "@arco-design/web-react";
import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { routeTree } from "./routeTree.gen";
import { closeNotification, showMessage, showNotification } from "@/lib/feedback";

const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const feedback = query.meta?.errorNotification;
      if (!feedback) return;
      showNotification({
        id: feedback.id,
        state: "error",
        action: feedback.action,
        content: { error, fallback: feedback.fallback ?? `${feedback.action}失败` },
      });
    },
    onSuccess: (_data, query) => {
      const id = query.meta?.errorNotification?.id;
      if (id) closeNotification(id);
    },
  }),
  mutationCache: new MutationCache({
    onMutate: (_variables, mutation) => {
      const feedback = mutation.meta?.feedback;
      if (feedback?.channel !== "notification") return;
      showNotification({ id: feedback.id, state: "loading", action: feedback.action });
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      const feedback = mutation.meta?.feedback;
      if (!feedback) return;
      if (feedback.channel === "message") {
        showMessage({
          type: "success",
          content: feedback.successText ?? `${feedback.action}成功`,
        });
        return;
      }
      showNotification({
        id: feedback.id,
        state: "success",
        action: feedback.action,
        content: feedback.successText,
      });
    },
    onError: (error, _variables, _context, mutation) => {
      const feedback = mutation.meta?.feedback;
      if (!feedback) return;
      const content = { error, fallback: feedback.errorFallback ?? `${feedback.action}失败` };
      if (feedback.channel === "message") {
        showMessage({ type: "error", content });
        return;
      }
      showNotification({ id: feedback.id, state: "error", action: feedback.action, content });
    },
  }),
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
});

const COMPONENT_CONFIG = {
  Form: {
    onSubmitFailed: () => showMessage({ type: "error", content: "请检查并修正表单中的错误项" }),
  },
};

const router = createRouter({ routeTree, trailingSlash: "never", context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider theme={{ primaryColor: "#0079D3" }} componentConfig={COMPONENT_CONFIG}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  </StrictMode>,
);
