import { useState, type ComponentProps } from "react";
import { Divider, Modal } from "@arco-design/web-react";
import { ImageSpaceCard } from "../ImageSpaceCard";
import { ImageCredentialCard } from "../ImageCredentialCard";
import { ImagePushInstructionsModal } from "../ImagePushInstructionsModal";

type ManageImageSpaceModalProps = ComponentProps<typeof ImageSpaceCard> & { onCancel: () => void };

export function ManageImageSpaceModal({ onCancel, ...props }: ManageImageSpaceModalProps) {
  const [push, setPush] = useState(false);
  const writable = props.bindingStatus === "ready" || props.bindingStatus === "available";
  return (
    <Modal
      visible
      title="镜像空间与推送凭证"
      footer={null}
      onCancel={onCancel}
      style={{ width: 680 }}
    >
      <div className="flex flex-col gap-4">
        <ImageSpaceCard {...props} onPush={() => setPush(true)} />
        {props.space && (
          <>
            <Divider className="my-0!" />
            <ImageCredentialCard
              target={props.target}
              enabled
              writable={writable}
              onChanged={props.onChanged}
            />
          </>
        )}
      </div>
      {push && props.space && (
        <ImagePushInstructionsModal space={props.space} onCancel={() => setPush(false)} />
      )}
    </Modal>
  );
}
