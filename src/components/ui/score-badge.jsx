"use client";

import { formatScoreRange, resolveScoreTier } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   scoreTier: import("@/lib/score").ScoreTierKey | string,
 *   showValue?: boolean,
 *   size?: "sm" | "md",
 *   className?: string
 * }} props
 */
export function ScoreBadge({
  scoreTier,
  showValue = false,
  size = "sm",
  className,
}) {
  const tier = resolveScoreTier(scoreTier);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-semibold whitespace-nowrap text-white",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm",
        className
      )}
      style={{
        backgroundColor: tier.color,
      }}
      title={`${formatScoreRange(tier)} · ${tier.label}`}
    >
      {showValue && (
        <span className="font-bold tabular-nums">{formatScoreRange(tier)}</span>
      )}
      <span>{tier.label}</span>
    </span>
  );
}

/**
 * @param {{
 *   scoreTier: import("@/lib/score").ScoreTierKey | string,
 *   className?: string
 * }} props
 */
export function ActionScoreDot({ scoreTier, className }) {
  const tier = resolveScoreTier(scoreTier);
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white text-[9px] leading-none px-1",
        "min-w-7 h-7",
        className
      )}
      style={{ backgroundColor: tier.color }}
      title={`${formatScoreRange(tier)} · ${tier.label}`}
    >
      {Number.isFinite(tier.max) ? tier.max : "101+"}
    </span>
  );
}
