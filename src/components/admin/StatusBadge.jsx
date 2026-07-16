"use client";

import { STATUS_LABELS, STATUS_COLORS } from "@/lib/types/recommendation";
import { cn } from "@/lib/utils";

/**
 * @param {{ status: import("@/lib/types/recommendation").RecommendationStatus, className?: string }} props
 */
export function StatusBadge({ status, className }) {
  const c = STATUS_COLORS[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        className
      )}
      style={{ color: c.color, backgroundColor: c.bg, borderColor: c.border }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full opacity-80"
        style={{ backgroundColor: c.color }}
      />
      {STATUS_LABELS[status]}
    </span>
  );
}
