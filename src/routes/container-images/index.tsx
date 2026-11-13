import { createFileRoute } from "@tanstack/react-router";
import { ContainerImagesPage } from "@/components/container-images/ContainerImagesPage";

export const Route = createFileRoute("/container-images/")({
  component: ContainerImagesPage,
});
