import { createFileRoute } from "@tanstack/react-router";
import { VirtualSwitchesPage } from "@/components/virtual-switch/VirtualSwitchesPage";

export const Route = createFileRoute("/virtual-switches/")({ component: VirtualSwitchesPage });
