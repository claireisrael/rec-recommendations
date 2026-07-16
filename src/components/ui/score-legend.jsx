"use client";

import { SELECTABLE_SCORE_TIERS, formatScoreRange } from "@/lib/score";

/**
 * @param {{ className?: string }} props
 */
export function ScoreLegend({ className }) {
  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        {SELECTABLE_SCORE_TIERS.map((tier) => (
          <span
            key={tier.key}
            className="inline-flex items-center gap-1.5 text-sm font-semibold whitespace-nowrap"
            style={{ color: tier.color }}
          >
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: tier.color }}
              aria-hidden
            />
            {formatScoreRange(tier)} {tier.label}
          </span>
        ))}
      </div>
    </div>
  );
}
