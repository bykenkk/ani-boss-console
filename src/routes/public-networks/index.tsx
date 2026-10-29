import { createFileRoute } from "@tanstack/react-router";
import { PublicNetworksPage } from "@/components/public-network/PublicNetworksPage";

export const Route = createFileRoute("/public-networks/")({ component: PublicNetworksPage });
