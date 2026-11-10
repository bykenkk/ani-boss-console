import { Button } from "@arco-design/web-react";
import { IconCopy } from "@arco-design/web-react/icon";
import clsx from "clsx";
import type { ReactNode } from "react";
import { copyToClipboard } from "@/lib/clipboard";

type ResourceIdentityProps = {
  name?: string | null;
  nameSuffix?: ReactNode;
  id?: string | number | null;
  idLabel?: string;
  display?: "all" | "name" | "id";
  className?: string;
  openable?: boolean;
  copyable?: boolean;
  onOpen?: () => void;
};

export function ResourceIdentity({
  name,
  nameSuffix,
  id,
  idLabel = "资源 ID",
  display = "all",
  className,
  openable = true,
  copyable = true,
  onOpen,
}: ResourceIdentityProps) {
  const resourceId =
    id === undefined || id === null || id === "" || id === "-" ? undefined : String(id);
  const idContent = (
    <span
      className={clsx(
        "inline-flex max-w-full min-w-0 items-center gap-1 align-middle",
        display === "id" && className,
      )}
    >
      <span className="min-w-0 truncate font-mono" title={resourceId}>
        {resourceId || "-"}
      </span>
      {copyable && resourceId && (
        <Button
          title={`复制${idLabel}`}
          aria-label={`复制${idLabel}`}
          className="h-4! w-4! shrink-0 p-0!"
          type="text"
          size="mini"
          icon={<IconCopy />}
          onClick={(event) => {
            event.stopPropagation();
            copyToClipboard(resourceId, idLabel);
          }}
        />
      )}
    </span>
  );

  if (display === "id") return idContent;

  return (
    <div className={clsx("flex w-0 min-w-full flex-col gap-0.5", className)}>
      <div className="flex min-w-0 items-center gap-2">
        <span
          className="block min-w-0 max-w-full truncate text-sm leading-5 text-(--color-text-1)"
          title={name ?? undefined}
        >
          {openable && onOpen ? (
            <Button
              type="text"
              className="block! h-auto! max-w-full overflow-hidden! p-0! text-left! text-ellipsis whitespace-nowrap! text-sm! leading-5!"
              onClick={(event) => {
                event.stopPropagation();
                onOpen();
              }}
            >
              {name || "-"}
            </Button>
          ) : (
            name || "-"
          )}
        </span>
        {nameSuffix && <span className="inline-flex shrink-0 items-center">{nameSuffix}</span>}
      </div>
      {display === "all" && (
        <span className="min-w-0 text-xs leading-4 text-(--color-text-2)">{idContent}</span>
      )}
    </div>
  );
}
