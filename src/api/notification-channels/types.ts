import type { PageParams } from "@/api/types";

export type NotificationChannelType = "EMAIL" | "WEBHOOK";
export type NotificationChannelTls = "NONE" | "START_TLS" | "SSL";

export interface NotificationChannel {
  id?: number;
  name?: string;
  type?: NotificationChannelType;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpFrom?: string;
  smtpTls?: NotificationChannelTls;
  hasPassword?: boolean;
  enabled?: boolean;
  remark?: string;
  createdBy?: number;
  updatedBy?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationChannelList {
  items: NotificationChannel[];
  total: string;
}

export type NotificationChannelListParams = PageParams;

export interface NotificationChannelDataInput {
  name?: string;
  type?: NotificationChannelType;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpFrom?: string;
  smtpTls?: NotificationChannelTls;
  enabled?: boolean;
  remark?: string;
}

export interface NotificationChannelInput {
  data: NotificationChannelDataInput;
  password?: string;
}

export interface UpdateNotificationChannelRequest extends NotificationChannelInput {
  updateMask: string;
}
