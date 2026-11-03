import { createFileRoute } from "@tanstack/react-router";
import { BasicNetworksPage } from "@/components/basic-network/BasicNetworksPage";

export const Route = createFileRoute("/basic-networks/")({ component: BasicNetworksPage });
