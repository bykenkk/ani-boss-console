import type { NotificationChannelTls, NotificationChannelType } from "@/api/notification-channels";

export const channelTypeLabels: Record<NotificationChannelType, string> = {
  EMAIL: "邮件",
  WEBHOOK: "Webhook",
};

export const channelTlsLabels: Record<NotificationChannelTls, string> = {
  NONE: "无加密",
  START_TLS: "STARTTLS",
  SSL: "SSL/TLS",
};
