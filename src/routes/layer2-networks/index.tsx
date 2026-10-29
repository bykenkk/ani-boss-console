import { createFileRoute } from "@tanstack/react-router";
import { Layer2NetworksPage } from "@/components/layer2-network/Layer2NetworksPage";

export const Route = createFileRoute("/layer2-networks/")({ component: Layer2NetworksPage });
