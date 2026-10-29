import { createFileRoute } from "@tanstack/react-router";
import { ApisPage } from "@/components/management/ApisPage";
export const Route = createFileRoute("/apis/")({ component: ApisPage });
