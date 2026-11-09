import { Button } from "@arco-design/web-react";
import type { ClusterOpsGetResourceResponse } from "@/api/cluster-ops";

interface ResourceManifestProps {
  value: ClusterOpsGetResourceResponse;
  raw?: boolean;
  onRevealSecret: () => void;
}
export function ResourceManifest({ value, raw = false, onRevealSecret }: ResourceManifestProps) {
  if (value.resource.secret_data_redacted && !raw)
    return (
      <div className="flex flex-col gap-3">
        <p>Secret 默认脱敏。键：{value.resource.secret_keys.join(", ") || "-"}</p>
        <p>脱敏内容不能提交为真实配置。</p>
        <Button onClick={onRevealSecret}>查看内容</Button>
      </div>
    );
  return (
    <pre
      className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-all rounded bg-[var(--color-fill-1)] p-4 font-mono text-xs"
      aria-label={raw ? "原始 JSON" : "资源 YAML"}
    >
      {raw ? value.resource.object_json : value.manifest_yaml || "当前未取得可展示的 YAML"}
    </pre>
  );
}
