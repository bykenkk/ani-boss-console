import { Button, Modal, Typography } from "@arco-design/web-react";
import type { ImageSpace } from "@/api/container-images";
import { copyToClipboard } from "@/lib/clipboard";

interface ImagePushInstructionsModalProps {
  space: ImageSpace;
  onCancel: () => void;
}

export function ImagePushInstructionsModal({ space, onCancel }: ImagePushInstructionsModalProps) {
  const target = `${space.registryAuthority}/${space.projectName}/app:latest`;
  const commands = [
    {
      label: "登录仓库，按提示输入推送凭证的用户名和密码",
      command: `docker login ${space.registryAuthority}`,
    },
    {
      label: "标记镜像，将 local-image:latest 替换为本地镜像",
      command: `docker tag local-image:latest ${target}`,
    },
    { label: "推送镜像", command: `docker push ${target}` },
  ];
  return (
    <Modal visible title="推送镜像说明" footer={null} onCancel={onCancel} style={{ width: 720 }}>
      <div className="flex flex-col gap-4">
        <Typography.Text>
          先签发并保存推送凭证，再在本地终端执行示例命令。推送成功后点击“添加镜像”，填写镜像地址。
        </Typography.Text>
        <Typography.Text type="secondary">
          示例仓库 app 和标签 latest 可按实际镜像调整。网页不直接上传镜像文件。
        </Typography.Text>
        {commands.map(({ label, command }) => (
          <div key={label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <Typography.Text>{label}</Typography.Text>
              <Button type="text" size="small" onClick={() => copyToClipboard(command, "命令")}>
                复制
              </Button>
            </div>
            <Typography.Text code className="break-all">
              {command}
            </Typography.Text>
          </div>
        ))}
      </div>
    </Modal>
  );
}
