import { Button, Descriptions, Skeleton, Typography } from "@arco-design/web-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { imageKeys, type ImageTarget } from "@/api/container-images";
import { StatusBadge, ToolbarIconButton } from "@/components/common";
import { withId } from "@/lib/id";
import { imageOperations } from "../operations";
import { credentialExpired, imageQueryOptions, imageTime } from "../model";
import {
  PublisherCredentialModal,
  type PublisherCredentialAction,
} from "../PublisherCredentialModal";
interface ImageCredentialCardProps {
  target: ImageTarget;
  enabled: boolean;
  writable: boolean;
  onChanged: () => Promise<unknown>;
}
const labels = { not_issued: "未签发", active: "有效", disabled: "已停用", blocked: "受阻" };
export function ImageCredentialCard({
  target,
  enabled,
  writable,
  onChanged,
}: ImageCredentialCardProps) {
  const [action, setAction] = useState<PublisherCredentialAction>();
  const api = imageOperations(target);
  const query = useQuery({
    ...imageQueryOptions,
    queryKey: imageKeys.credential(target),
    queryFn: ({ signal }) => api.getCredential(signal),
    enabled,
    meta: {
      errorNotification: {
        id: withId("image-credential", ...imageKeys.target(target)),
        action: "推送凭证加载",
      },
    },
  });
  const credential = query.data;
  const expired = credential ? credentialExpired(credential.expiresAt) : false;
  const firstIssue =
    credential?.state === "not_issued" ||
    (credential?.state === "blocked" && credential.generation === "0");
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <Typography.Text bold>推送凭证</Typography.Text>
        <ToolbarIconButton
          label="刷新推送凭证"
          spinning={query.isFetching}
          disabled={!enabled || query.isFetching}
          onClick={() => query.refetch()}
        />
      </div>
      <Skeleton loading={enabled && query.isPending}>
        <Descriptions
          column={1}
          valueStyle={{ wordBreak: "break-all" }}
          data={[
            {
              label: "状态",
              value: (
                <StatusBadge
                  value={credential ? labels[credential.state] : "-"}
                  tone={credential?.state === "active" ? "success" : "warning"}
                />
              ),
            },
            { label: "用户名", value: credential?.username || "-" },
            {
              label: "有效期至",
              value:
                expired && credential?.state === "active"
                  ? `${imageTime(credential.expiresAt)}（已过期，请重置凭证）`
                  : imageTime(credential?.expiresAt),
            },
            { label: "更新时间", value: imageTime(credential?.updatedAt) },
          ]}
        />
      </Skeleton>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!credential || !writable || query.isFetching || !!action}
          onClick={() => setAction(firstIssue ? "issue" : "reset")}
        >
          {firstIssue ? "签发凭证" : "重置凭证"}
        </Button>
        <Button
          status="danger"
          disabled={
            !credential ||
            credential.generation === "0" ||
            credential.state === "disabled" ||
            query.isFetching ||
            !!action
          }
          onClick={() => setAction("disable")}
        >
          停用凭证
        </Button>
      </div>
      {action && credential && (
        <PublisherCredentialModal
          target={target}
          credential={credential}
          action={action}
          onCancel={() => setAction(undefined)}
          onChanged={onChanged}
          onConflict={async () => {
            const refreshed = await query.refetch();
            return refreshed.isSuccess ? refreshed.data : undefined;
          }}
        />
      )}
    </section>
  );
}
