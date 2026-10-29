import "@arco-design/web-react/dist/css/arco.css";
import "@/styles/tailwind.css";
import "@/styles/global.less";
import { ConfigProvider, type ConfigProviderProps } from "@arco-design/web-react";
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
      const declaredFeedback = mutation.meta?.feedback;
      const feedback =
        typeof declaredFeedback === "function" ? declaredFeedback(_variables) : declaredFeedback;
      if (feedback?.channel !== "notification") return;
      showNotification({ id: feedback.id, state: "loading", action: feedback.action });
    },
    onSuccess: (_data, _variables, _context, mutation) => {
      const declaredFeedback = mutation.meta?.feedback;
      const feedback =
        typeof declaredFeedback === "function" ? declaredFeedback(_variables) : declaredFeedback;
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
        title: feedback.successText,
        content: feedback.successDescription,
      });
    },
    onError: (error, _variables, _context, mutation) => {
      const declaredFeedback = mutation.meta?.feedback;
      const feedback =
        typeof declaredFeedback === "function" ? declaredFeedback(_variables) : declaredFeedback;
      if (!feedback) return;
      const content = { error, fallback: feedback.errorFallback ?? `${feedback.action}失败` };
      if (feedback.channel === "message") {
        showMessage({ type: "error", content });
        return;
      }
      showNotification({ id: feedback.id, state: "error", action: feedback.action, content });
    },
  }),
  defaultOptions: {
    queries: {
      gcTime: 0,
      retry: false,
      retryOnMount: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
    },
    mutations: { gcTime: 0 },
  },
});

const COMPONENT_CONFIG = {
  Form: {
    onSubmitFailed: () => showMessage({ type: "error", content: "请检查并修正表单中的错误项" }),
  },
  Modal: {
    maskClosable: false,
    getChildrenPopupContainer: (node) => {
      // 挂到正文外、焦点范围内，避免子弹出层被正文滚动区域裁切。
      const content = node.closest(".arco-modal")?.querySelector(".arco-modal-content");
      return content?.parentElement ?? node.ownerDocument.body;
    },
  },
  Trigger: {
    updateOnScroll: true,
  },
  Select: {
    triggerProps: {
      autoAlignPopupWidth: false,
      autoAlignPopupMinWidth: true,
      position: "bl",
    },
  },
  Table: { placeholder: "-" },
  Card: {
    bordered: false,
    style: { borderRadius: 8 },
  },
} satisfies ConfigProviderProps["componentConfig"];

const router = createRouter({ routeTree, trailingSlash: "never", context: { queryClient } });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ConfigProvider componentConfig={COMPONENT_CONFIG}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </ConfigProvider>
  </StrictMode>,
);
