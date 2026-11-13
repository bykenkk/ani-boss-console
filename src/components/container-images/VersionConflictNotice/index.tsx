import { Alert, Button } from "@arco-design/web-react";
interface VersionConflictNoticeProps {
  onAdopt: () => void;
  disabled?: boolean;
}
export function VersionConflictNotice({ onAdopt, disabled }: VersionConflictNoticeProps) {
  return (
    <Alert
      type="warning"
      content={
        <div className="flex items-center justify-between gap-3">
          <span>数据已被修改。请确认最新版本后再次提交。</span>
          <Button disabled={disabled} onClick={onAdopt}>
            采用最新版本
          </Button>
        </div>
      }
    />
  );
}
