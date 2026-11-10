import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { array, field, nativeObject } from "../model";

export function serviceAccountSummary(doc: ClusterOpsResourceDocument) {
  const object = nativeObject(doc);
  const secretNames = array(object.secrets)
    .map((secret) => field(secret, "name"))
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  const imagePullSecretNames = array(object.imagePullSecrets)
    .map((secret) => field(secret, "name"))
    .filter((name): name is string => typeof name === "string" && name.length > 0);
  return {
    secretNames: secretNames.join(", ") || "-",
    imagePullSecretNames: imagePullSecretNames.join(", ") || "-",
    automountToken:
      object.automountServiceAccountToken === true
        ? "开启"
        : object.automountServiceAccountToken === false
          ? "关闭"
          : "默认",
  };
}
