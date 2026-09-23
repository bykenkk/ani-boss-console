import clsx from "clsx";
import type { PlatformMeteringResourceType } from "@/api/platform";
import { formatUsage } from "@/lib/metering";
import { meteringDimensions, type MeteringDimension } from "../model";

interface MeteringDimensionCardsProps {
  dimension: MeteringDimension;
  totals: readonly { resourceType: PlatformMeteringResourceType; value?: number }[];
  onChange: (dimension: MeteringDimension) => void;
}

export function MeteringDimensionCards({
  dimension,
  totals,
  onChange,
}: MeteringDimensionCardsProps) {
  const values = new Map(totals.map((item) => [item.resourceType, item.value]));

  return (
    <div className="flex flex-wrap gap-4" role="group" aria-label="计量维度">
      {meteringDimensions.map((item) => {
        const selected = item.key === dimension;
        const value = values.get(item.resourceType);
        return (
          <button
            key={item.key}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(item.key)}
            className={clsx(
              "w-70 max-w-full cursor-pointer appearance-none rounded-lg border-0 px-5 py-4 text-left shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500",
              selected ? "bg-blue-50" : "bg-white hover:bg-gray-50",
            )}
          >
            <span className="flex items-center justify-between gap-3 text-sm text-gray-600">
              <span>{item.cardLabel}</span>
              {selected ? <span className="font-medium text-blue-600">已选中</span> : null}
            </span>
            <span className="mt-4 block text-2xl leading-none font-semibold text-gray-900">
              {value === undefined ? "-" : formatUsage(value)}
            </span>
            <span className="mt-2 block text-sm text-gray-500">{item.cardUnit}</span>
          </button>
        );
      })}
    </div>
  );
}
