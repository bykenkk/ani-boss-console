import { Drawer } from "@arco-design/web-react";

interface PlatformLogRawDrawerProps {
  message: string;
  onClose: () => void;
}

export function PlatformLogRawDrawer({ message, onClose }: PlatformLogRawDrawerProps) {
  let formattedMessage: string;
  try {
    formattedMessage = JSON.stringify(JSON.parse(message), null, 2);
  } catch {
    formattedMessage = message;
  }

  return (
    <Drawer visible width={760} title="日志原文" footer={null} onCancel={onClose}>
      <pre className="m-0 rounded bg-[var(--color-fill-1)] p-4 font-mono text-sm whitespace-pre-wrap break-all">
        {formattedMessage}
      </pre>
    </Drawer>
  );
}
