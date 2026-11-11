import { Card, Statistic, Typography } from "@arco-design/web-react";
import clsx from "clsx";

interface MetricProps {
  label: string;
  value: string;
  hint: string;
  tone?: string;
  onClick?: () => void;
}

export function Metric({ label, value, hint, tone = "", onClick }: MetricProps) {
  return (
    <Card
      hoverable={Boolean(onClick)}
      className={clsx(
        "h-full min-h-[112px] rounded-md [&_.arco-card-body]:p-4",
        onClick && "cursor-pointer",
      )}
      onClick={onClick}
    >
      <Statistic
        title={label}
        value={value}
        styleValue={{
          color: tone === "danger" ? "rgb(var(--danger-6))" : "var(--color-text-1)",
          fontSize: 28,
          lineHeight: 1.2,
        }}
        extra={
          <Typography.Text
            className={clsx(
              "text-xs",
              tone === "danger" || tone === "warning"
                ? "text-[rgb(var(--warning-6))]"
                : "text-(--color-text-2)",
            )}
          >
            {hint}
          </Typography.Text>
        }
      />
    </Card>
  );
}
