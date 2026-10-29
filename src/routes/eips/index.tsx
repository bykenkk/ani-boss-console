import { createFileRoute } from "@tanstack/react-router";
import { EIPsPage } from "@/components/eip/EIPsPage";

export const Route = createFileRoute("/eips/")({ component: EIPsPage });
