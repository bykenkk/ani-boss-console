import { adminRequest } from "@/api/request";
import type {
  NotificationChannel,
  NotificationChannelInput,
  NotificationChannelList,
  NotificationChannelListParams,
  UpdateNotificationChannelRequest,
} from "./types";

export * from "./types";

const path = "/notification-channels";

export const notificationChannelKeys = {
  all: ["notification-channels"] as const,
  lists: ["notification-channels", "list"] as const,
  list: (params: NotificationChannelListParams) =>
    ["notification-channels", "list", params] as const,
  detail: (id: number) => ["notification-channels", "detail", id] as const,
};

// 分页例外：通知渠道沿用上游 PagingRequest 契约（默认每页 10 条、非法值修正、超限截断）。
// 前端显式传 page/pageSize（默认 20、最多 100）；列表与计数由上游分开读取。
// 此模块不适用平台严格分页约定。
export function listNotificationChannels(
  params: NotificationChannelListParams,
  signal?: AbortSignal,
): Promise<NotificationChannelList> {
  return adminRequest(path, {
    signal,
    params: {
      page: params.page ?? 1,
      pageSize: Math.min(100, Math.max(1, params.pageSize ?? 20)),
      orderBy: "id desc",
    },
  });
}

export function getNotificationChannel(
  id: number,
  signal?: AbortSignal,
): Promise<NotificationChannel> {
  return adminRequest(path + "/" + id, { signal });
}

// TODO(notification-channel-integration): 验证 401 自动刷新和请求取消；启用真实 SMTP 后验证成功发送。
// 重名当前返回通用 500，保留真实失败信息，待上游提供专用 reason 后再映射名称冲突提示。
// 上游这些写接口未声明幂等 key，password 按契约放在请求体顶层。
export async function createNotificationChannel(input: NotificationChannelInput): Promise<void> {
  await adminRequest(path, { method: "POST", data: input });
}

export async function updateNotificationChannel(
  id: number,
  input: NotificationChannelInput,
): Promise<void> {
  const data: UpdateNotificationChannelRequest = {
    data: input.data,
    updateMask: Object.keys(input.data).join(","),
    ...(input.password ? { password: input.password } : {}),
  };
  await adminRequest(path + "/" + id, { method: "PUT", data });
}

export async function deleteNotificationChannel(id: number): Promise<void> {
  await adminRequest(path + "/" + id, { method: "DELETE" });
}

export async function sendNotificationChannelTestEmail(
  id: number,
  recipient: string,
): Promise<void> {
  await adminRequest(path + "/" + id + "/send-test-email", {
    method: "POST",
    data: { recipient },
  });
}
