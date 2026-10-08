import { servicesRequest } from "@/api/request";
import type { KaiwuEntry } from "./types";

export function getKaiwuBossEntry(signal?: AbortSignal): Promise<KaiwuEntry> {
  return servicesRequest<KaiwuEntry>("/integrations/kaiwu/boss/entry", {
    method: "GET",
    signal,
  });
}
