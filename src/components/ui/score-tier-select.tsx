"use client";

import { Select } from "@/components/ui/select";
import { ScoreBadge } from "@/components/ui/score-badge";
import { SCORE_TIER_OPTIONS } from "@/lib/score";
import type { ScoreTierKey } from "@/lib/score";
import { cn } from "@/lib/utils";

interface ScoreTierSelectProps {
  value: ScoreTierKey;
  onChange: (scoreTier: ScoreTierKey) => void;
  className?: string;
  showBadge?: boolean;
}

export function ScoreTierSelect({
  value,
  onChange,
  className,
  showBadge = true,
}: ScoreTierSelectProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Select
        value={value}
        onChange={(v) => onChange(v as ScoreTierKey)}
        options={SCORE_TIER_OPTIONS}
        placeholder="Select rating..."
        className="flex-1"
      />
      {showBadge && <ScoreBadge scoreTier={value} size="md" />}
    </div>
  );
}
