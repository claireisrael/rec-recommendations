"use client";

import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "text-[11px] px-2 py-0.5 gap-0.5",
  md: "text-xs px-2.5 py-1 gap-0.5",
  lg: "text-sm px-3 py-1 gap-1",
  xl: "text-base px-3.5 py-1.5 gap-1",
};

/**
 * @param {{ code: string, size?: "sm" | "md" | "lg" | "xl", className?: string, showR?: boolean }} props
 */
export function NumberCode({
  code,
  size = "md",
  className,
  showR = true,
}) {
  const cleaned = code.trim().replace(/^R\s*/i, "");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md font-semibold tabular-nums tracking-tight text-white",
        "bg-secondary",
        sizeClasses[size],
        className
      )}
      title={showR ? `R ${cleaned}` : cleaned}
    >
      {showR && <span>R</span>}
      <span className="font-mono tracking-tight">{cleaned}</span>
    </span>
  );
}
