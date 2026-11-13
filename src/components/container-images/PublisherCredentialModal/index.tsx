import { Alert, Button, Descriptions, Modal, Typography } from "@arco-design/web-react";
import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ApiError, getAuthSessionSignal } from "@/api/request";
import type { CredentialDelivery, ImageTarget, PublisherCredential } from "@/api/container-images";
import { copyToClipboard } from "@/lib/clipboard";
import { withId } from "@/lib/id";
import { imageOperations } from "../operations";
import { imageTime } from "../model";
import { VersionConflictNotice } from "../VersionConflictNotice";
export type PublisherCredentialAction = "issue" | "reset" | "disable";
interface PublisherCredentialModalProps {
  target: ImageTarget;
  credential: PublisherCredential;
  action: PublisherCredentialAction;
  onCancel: () => void;
  onChanged: () => Promise<unknown>;
  onConflict: () => Promise<PublisherCredential | undefined>;
}
const titles = { issue: "签发推送凭证", reset: "重置推送凭证", disable: "停用推送凭证" };
export function PublisherCredentialModal({
  target,
  credential,
  action,
  onCancel,
  onChanged,
  onConflict,
}: PublisherCredentialModalProps) {
  const [version, setVersion] = useState(credential.version);
  const [latest, setLatest] = useState<PublisherCredential>();
  const [conflict, setConflict] = useState(false);
  const [delivery, setDelivery] = useState<CredentialDelivery>();
  const [expiredReplay, setExpiredReplay] = useState(false);
  const active = useRef(false);
  const api = imageOperations(target);
  const close = () => {
    active.current = false;
    setDelivery(undefined);
    onCancel();
  };
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    const session = getAuthSessionSignal();
    const clear = () => {
      active.current = false;
      setDelivery(undefined);
      onCancel();
    };
    if (session.aborted) clear();
    else session.addEventListener("abort", clear, { once: true });
    return () => session.removeEventListener("abort", clear);
  }, [onCancel]);
  const mutation = useMutation({
    gcTime: 0,
    retry: false,
    // 密钥只进入当前弹窗临时状态；mutation 返回 void，不将投递响应放入 MutationCache。
    mutationFn: async () => {
      const signal = getAuthSessionSignal();
      if (!active.current || signal.aborted) return;
      if (action === "disable") await api.disable({ expectedVersion: version }, signal);
      else {
        const response = await api[action]({ expectedVersion: version }, signal);
        // 关闭、卸载或切换会话后，迟到的密钥响应不得写回弹窗。
        if (!active.current || signal.aborted) return;
        setDelivery(response);
      }
      if (!active.current || signal.aborted) return;
      await onChanged();
      if (action === "disable" && active.current && !signal.aborted) close();
    },
    onError: async (error) => {
      const signal = getAuthSessionSignal();
      if (!active.current || signal.aborted) return;
      if (error instanceof ApiError && error.reason === "VERSION_CONFLICT") {
        setConflict(true);
        const latestCredential = await onConflict();
        if (active.current && !signal.aborted) setLatest(latestCredential);
      }
      if (error instanceof ApiError && error.reason === "CREDENTIAL_DELIVERY_EXPIRED") {
        setExpiredReplay(true);
        await onChanged();
      }
    },
    meta: {
      feedback: {
        channel: "notification",
        id: withId("image-credential-write", ...imageKeysForFeedback(target), action),
        action: titles[action],
        successText: action === "disable" ? "推送凭证已停用" : "推送凭证已生成",
      },
    },
  });
  const submit = async () => {
    if (delivery || expiredReplay) {
      close();
      return;
    }
    try {
      await mutation.mutateAsync();
    } catch {
      /* 统一 mutation 反馈。 */
    }
  };
  return (
    <Modal
      visible
      title={delivery ? "保存推送凭证" : titles[action]}
      onCancel={close}
      onOk={submit}
      okText={delivery || expiredReplay ? "关闭" : "确认"}
      confirmLoading={mutation.isPending}
      okButtonProps={{ disabled: conflict }}
    >
      {delivery ? (
        <div className="flex flex-col gap-4">
          <Alert
            type="warning"
            content="密码仅显示一次，请立即复制并妥善保存。关闭后无法再次查看。"
          />
          <Descriptions
            column={1}
            data={[
              { label: "用户名", value: delivery.credential.username },
              { label: "有效期至", value: imageTime(delivery.credential.expiresAt) },
            ]}
          />
          <Typography.Paragraph className="break-all">{delivery.secret}</Typography.Paragraph>
          <Button onClick={() => copyToClipboard(delivery.secret, "凭证密码")}>复制密码</Button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <Alert
            type={action === "issue" ? "info" : "warning"}
            content={
              action === "disable"
                ? "停用后，当前凭证将无法继续推送镜像。"
                : action === "reset"
                  ? "重置后，原凭证立即失效。请更新 Docker 或 CI/CD 中使用的凭证。"
                  : "签发后将显示用于登录镜像仓库的用户名和密码，请立即保存。"
            }
          />
          {conflict && (
            <VersionConflictNotice
              disabled={!latest}
              onAdopt={() => {
                if (!latest) return;
                setVersion(latest.version);
                setLatest(undefined);
                setConflict(false);
              }}
            />
          )}
          {expiredReplay && (
            <Alert
              type="warning"
              content="原凭证密码已无法再次获取。请关闭弹窗，刷新状态后重新确认重置凭证。"
            />
          )}
        </div>
      )}
    </Modal>
  );
}
function imageKeysForFeedback(target: ImageTarget) {
  return target.scope === "platform" ? ["platform"] : ["tenant", target.tenantId];
}
