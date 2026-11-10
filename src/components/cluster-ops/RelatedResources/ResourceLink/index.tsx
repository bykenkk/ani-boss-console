import { ResourceIdentity } from "@/components/common";
import { useNavigate } from "@tanstack/react-router";
import type { ClusterOpsResourceRef } from "@/api/cluster-ops";
import { resourceDetailDestination } from "../resource-navigation";

interface ResourceLinkProps {
  resourceRef: ClusterOpsResourceRef;
  label: string;
  id?: string;
}

export function ResourceLink({ resourceRef, label, id }: ResourceLinkProps) {
  const navigate = useNavigate();
  const destination = resourceDetailDestination(resourceRef);
  return (
    <ResourceIdentity
      name={label}
      id={id}
      idLabel="UID"
      display={id ? "all" : "name"}
      onOpen={destination ? () => navigate(destination) : undefined}
    />
  );
}
