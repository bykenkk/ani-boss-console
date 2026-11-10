import { Skeleton } from "@arco-design/web-react";

export function PageLoadingPlaceholder() {
  return (
    <div
      className="flex min-h-64 w-full min-w-0 flex-col gap-4"
      role="status"
      aria-busy="true"
      aria-label="正在加载页面"
    >
      <div className="rounded-lg bg-(--color-bg-2) p-6">
        <Skeleton loading animation text={{ rows: 1, width: "28%" }} />
      </div>
      <div className="flex-1 rounded-lg bg-(--color-bg-2) p-6">
        <Skeleton
          loading
          animation
          text={{ rows: 8, width: ["100%", "82%", "94%", "76%", "88%", "80%", "92%", "72%"] }}
        />
      </div>
    </div>
  );
}
