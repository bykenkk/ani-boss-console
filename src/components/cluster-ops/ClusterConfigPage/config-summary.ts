import type { ClusterOpsResourceDocument } from "@/api/cluster-ops";
import { field, nativeObject, record, text } from "../model";

const secretTypeLabels: Record<string, string> = {
  Opaque: "默认",
  "kubernetes.io/tls": "TLS 信息",
  "kubernetes.io/dockerconfigjson": "镜像服务信息",
  "kubernetes.io/dockercfg": "镜像服务信息",
  "kubernetes.io/basic-auth": "用户名和密码",
  "kubernetes.io/ssh-auth": "SSH 认证",
  "kubernetes.io/service-account-token": "服务账户令牌",
  "bootstrap.kubernetes.io/token": "引导令牌",
};

export function configSummary(doc: ClusterOpsResourceDocument) {
  const object = nativeObject(doc);
  // Secret 列表仅使用后端提供的键名，不展开或解码数据内容。
  const keys =
    doc.ref.type.resource === "secrets"
      ? doc.secret_keys
      : [...Object.keys(record(object.data)), ...Object.keys(record(object.binaryData))];
  const uniqueKeys = [...new Set(keys)];
  const type = text(object.type);
  return {
    type: secretTypeLabels[type] ?? type,
    keyNames: uniqueKeys.join(", "),
    keyCount: uniqueKeys.length,
    createdAt: String(field(object, "metadata", "creationTimestamp") ?? ""),
  };
}
