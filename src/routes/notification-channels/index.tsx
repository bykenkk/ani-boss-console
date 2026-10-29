import { createFileRoute } from "@tanstack/react-router";
import { NotificationChannelsPage } from "@/components/notification/NotificationChannelsPage";

export const Route = createFileRoute("/notification-channels/")({
  component: NotificationChannelsPage,
});
