"use client";

import {
  STATUS_LABELS,
  STATUS_COLORS,
  type RecommendationStatus,
} from "@/lib/types/recommendation";
import { cn } from "@/lib/utils";

export function StatusBadge({
  status,
  className,
}: {
  status: RecommendationStatus;
  className?: string;
}) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        className
      )}
      style={{ color: c.color, backgroundColor: c.bg, borderColor: c.border }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: c.color }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
