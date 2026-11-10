import { Button } from "@arco-design/web-react";
import { useNavigate } from "@tanstack/react-router";
import type { ClusterOpsResourceRef } from "@/api/cluster-ops";
import { resourceDetailDestination } from "../resource-navigation";

interface ResourceLinkProps {
  resourceRef: ClusterOpsResourceRef;
  label: string;
}

export function ResourceLink({ resourceRef, label }: ResourceLinkProps) {
  const navigate = useNavigate();
  const destination = resourceDetailDestination(resourceRef);
  if (!destination) return <span title={label}>{label}</span>;
  return (
    <Button type="text" title={label} onClick={() => navigate(destination)}>
      {label}
    </Button>
  );
}
