"use client";

import { Select } from "@/components/ui/select";
import { ScoreBadge } from "@/components/ui/score-badge";
import { toScoreTierKey, SCORE_TIER_OPTIONS } from "@/lib/score";
import { cn } from "@/lib/utils";

/**
 * @param {{
 *   value: import("@/lib/score").ScoreTierKey | string,
 *   onChange: (scoreTier: import("@/lib/score").ScoreTierKey) => void,
 *   className?: string,
 *   showBadge?: boolean
 * }} props
 */
export function ScoreTierSelect({
  value,
  onChange,
  className,
  showBadge = true,
}) {
  const resolved = toScoreTierKey(value);
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Select
        value={resolved}
        onChange={(v) => onChange(/** @type {import("@/lib/score").ScoreTierKey} */ (v))}
        options={SCORE_TIER_OPTIONS}
        placeholder="Select rating..."
        className="flex-1"
      />
      {showBadge && <ScoreBadge scoreTier={resolved} size="md" />}
    </div>
  );
}
