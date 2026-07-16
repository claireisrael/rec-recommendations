"use client";

import { getCategoryLabel, resolveCategory } from "@/lib/categories";
import { getCategoryCode } from "@/lib/numbering";
import { cn } from "@/lib/utils";

/**
 * @param {{ category: string | undefined | null, showCode?: boolean, className?: string }} props
 */
export function CategoryBadge({
  category,
  showCode = false,
  className,
}) {
  const key = resolveCategory(category);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border border-[rgba(5,70,83,0.1)] bg-white px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-primary-dark",
        className
      )}
    >
      {showCode && (
        <span className="font-mono tabular-nums text-primary/70">
          {getCategoryCode(key)}
        </span>
      )}
      {getCategoryLabel(key)}
    </span>
  );
}
