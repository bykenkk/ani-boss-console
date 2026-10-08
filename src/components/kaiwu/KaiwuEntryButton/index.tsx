import { useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { getKaiwuBossEntry } from "@/api/kaiwu";
import { ApiError } from "@/api/request";
import { reserveExternalWindow } from "@/lib/browser";

export function KaiwuEntryButton() {
  const pendingWindow = useRef<ReturnType<typeof reserveExternalWindow> | null>(null);
  const preparing = useRef(false);
  const requestController = useRef<AbortController | null>(null);
  const preparationError = useRef<unknown>(null);

  useEffect(
    () => () => {
      requestController.current?.abort();
      pendingWindow.current?.close();
      pendingWindow.current = null;
    },
    [],
  );

  const entry = useMutation({
    retry: false,
    networkMode: "always",
    gcTime: 0,
    meta: {
      feedback: {
        channel: "notification",
        id: "kaiwu-entry",
        action: "打开开物",
        successText: "已在新窗口打开开物",
        errorFallback: "暂时无法打开开物，请稍后重试",
      },
    },
    mutationFn: async () => {
      try {
        if (preparationError.current) throw preparationError.current;
        const popup = pendingWindow.current;
        if (!popup) throw new Error("打开操作已取消，请重试");
        // 凭据仅用于即时导航，不进入 Query/Mutation 返回值或客户端存储。
        requestController.current = new AbortController();
        const data = await getKaiwuBossEntry(requestController.current.signal);
        if (pendingWindow.current !== popup) throw new Error("打开操作已取消，请重试");
        if (
          !data ||
          data.client !== "boss" ||
          typeof data.entry_url !== "string" ||
          !data.entry_url
        ) {
          throw new Error("开物入口响应无效，请稍后重试");
        }
        popup.open(data.entry_url);
        pendingWindow.current = null;
      } catch (error) {
        pendingWindow.current?.close();
        pendingWindow.current = null;
        if (error instanceof ApiError) {
          if (error.code === "KAIWU_BOSS_ROLE_REQUIRED") {
            throw new Error("当前账号无开物访问权限，请使用 root 平台管理员账号");
          }
          if (error.code === "KAIWU_PLATFORM_USER_NOT_ACTIVE") {
            throw new Error("当前平台账号已停用，无法访问开物");
          }
          if (error.code === "KAIWU_USER_CREDENTIAL_REQUIRED") {
            throw new Error("请使用用户账号登录后访问开物");
          }
          if (error.status === 503) throw new Error("开物服务暂不可用，请稍后重试");
        }
        throw error;
      } finally {
        requestController.current = null;
        preparing.current = false;
        preparationError.current = null;
      }
    },
  });

  const open = () => {
    if (preparing.current || entry.isPending) return;
    preparing.current = true;
    try {
      pendingWindow.current = reserveExternalWindow();
    } catch (error) {
      preparationError.current = error;
    }
    entry.mutate();
  };

  return (
    <button
      type="button"
      className="topnav-kaiwu"
      aria-label="进入开物（新窗口）"
      aria-busy={entry.isPending}
      disabled={entry.isPending}
      onClick={open}
    >
      <span className="topnav-kaiwu-switch" aria-hidden="true">
        <span className="topnav-kaiwu-knob" />
      </span>
      <span>{entry.isPending ? "正在打开…" : "开物"}</span>
    </button>
  );
}
