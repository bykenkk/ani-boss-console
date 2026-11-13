import { Alert, Button, Descriptions, Skeleton, Typography } from "@arco-design/web-react";
import { useState } from "react";
import { StatusBadge, ToolbarIconButton } from "@/components/common";
import type { ImageSpace, ImageTarget } from "@/api/container-images";
import { imageTime } from "../model";
import { EnableImageSpaceModal } from "../EnableImageSpaceModal";
interface ImageSpaceCardProps {
  target: ImageTarget;
  space?: ImageSpace | null;
  bindingStatus?: string;
  configuredProject?: string;
  configuredAuthority?: string;
  loading: boolean;
  ready: boolean;
  onChanged: () => Promise<unknown>;
  onPush?: () => void;
}
const labels: Record<string, string> = {
  uninitialized: "未开通",
  ready: "已就绪",
  available: "可用",
  provisioning: "准备中",
  blocked: "受阻",
  configuration_mismatch: "配置不一致",
};
export function ImageSpaceCard({
  target,
  space,
  bindingStatus,
  configuredProject,
  configuredAuthority,
  loading,
  ready,
  onChanged,
  onPush,
}: ImageSpaceCardProps) {
  const [opening, setOpening] = useState(false);
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Typography.Text bold>镜像空间</Typography.Text>
        <div className="ml-auto flex gap-2">
          {onPush && (
            <Button
              disabled={!space || (bindingStatus !== "ready" && bindingStatus !== "available")}
              onClick={onPush}
            >
              推送说明
            </Button>
          )}
          <Button
            disabled={!ready || bindingStatus === "provisioning"}
            onClick={() => setOpening(true)}
          >
            {space ? "修复空间" : "开通空间"}
          </Button>
          <ToolbarIconButton
            label="刷新镜像空间"
            spinning={loading}
            disabled={loading}
            onClick={onChanged}
          />
        </div>
      </div>
      <Skeleton loading={loading}>
        <Descriptions
          column={1}
          valueStyle={{ wordBreak: "break-all" }}
          data={[
            {
              label: "状态",
              value: (
                <StatusBadge
                  value={labels[bindingStatus ?? ""] ?? "-"}
                  tone={
                    bindingStatus === "ready" || bindingStatus === "available"
                      ? "success"
                      : "warning"
                  }
                />
              ),
            },
            { label: "项目名称", value: space?.projectName ?? "-" },
            { label: "镜像仓库地址", value: space?.registryAuthority ?? "-" },
            ...(bindingStatus === "configuration_mismatch"
              ? [
                  { label: "配置项目", value: configuredProject ?? "-" },
                  { label: "配置仓库", value: configuredAuthority ?? "-" },
                ]
              : []),
            { label: "更新时间", value: imageTime(space?.updatedAt) },
          ]}
        />
      </Skeleton>
      {bindingStatus === "provisioning" && (
        <Alert type="info" content="镜像空间准备中，请稍后刷新空间状态。" />
      )}
      {(bindingStatus === "blocked" || bindingStatus === "configuration_mismatch") && (
        <Alert type="warning" content={space?.reason || labels[bindingStatus]} />
      )}
      {opening && (
        <EnableImageSpaceModal
          target={target}
          onCancel={() => setOpening(false)}
          onSuccess={async () => {
            await onChanged();
            setOpening(false);
          }}
        />
      )}
    </section>
  );
}
