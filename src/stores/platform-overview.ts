import { createStore } from "zustand/vanilla";
import { platformAlerts, type AlertItem, type AlertStatus } from "@/components/overview/model";
import { showMessage } from "@/lib/feedback";

interface PlatformOverviewState {
  alerts: AlertItem[];
  updateAlert: (id: number, status: AlertStatus) => void;
}

export function createPlatformOverviewStore() {
  return createStore<PlatformOverviewState>()((set) => ({
    alerts: platformAlerts.map((item) => ({ ...item })),
    updateAlert: (id, status) => {
      set(({ alerts }) => ({
        alerts: alerts.map((item) => (item.id === id ? { ...item, status } : item)),
      }));
      showMessage({
        type: "success",
        content: status === "已处理" ? "告警已处理" : "告警已忽略",
      });
    },
  }));
}
