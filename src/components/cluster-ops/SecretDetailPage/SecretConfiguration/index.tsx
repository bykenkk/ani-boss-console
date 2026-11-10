import { useState } from "react";
import type { ClusterOpsGetResourceResponse } from "@/api/cluster-ops";
import { ResourceManifest } from "../../ResourceManifest";
import { SecretContentModal } from "../../SecretContentModal";

interface SecretConfigurationProps {
  value: ClusterOpsGetResourceResponse;
}

export function SecretConfiguration({ value }: SecretConfigurationProps) {
  const [reveal, setReveal] = useState(false);
  return (
    <>
      <ResourceManifest value={value} onRevealSecret={() => setReveal(true)} />
      {reveal ? (
        <SecretContentModal resourceRef={value.resource.ref} onCancel={() => setReveal(false)} />
      ) : null}
    </>
  );
}
