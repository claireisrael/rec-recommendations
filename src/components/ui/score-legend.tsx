"use client";

import {
  SELECTABLE_SCORE_TIERS,
  formatScoreRange,
} from "@/lib/score";

/** Shared legend — same bands shown to contributors, L1, and superadmin. */
export function ScoreLegend({ className }: { className?: string }) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium text-foreground/85">
        Score each action using these ranges:
      </p>
      <div className="flex flex-wrap gap-1.5">
        {SELECTABLE_SCORE_TIERS.map((tier) => (
          <span
            key={tier.key}
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
            style={{ backgroundColor: tier.color }}
          >
            {formatScoreRange(tier)} · {tier.label}
          </span>
        ))}
      </div>
    </div>
  );
}
