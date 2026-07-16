"use client";

import {
  formatScoreRange,
  getScoreColor,
  getScoreLabel,
  resolveScoreTier,
} from "@/lib/score";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: { width: 80, stroke: 6, fontSize: "text-lg", labelSize: "text-[10px]" },
  md: { width: 120, stroke: 8, fontSize: "text-2xl", labelSize: "text-xs" },
  lg: { width: 160, stroke: 10, fontSize: "text-3xl", labelSize: "text-sm" },
};

/**
 * @param {{
 *   score: number,
 *   size?: "sm" | "md" | "lg",
 *   showLabel?: boolean,
 *   className?: string
 * }} props
 */
export function ScoreGauge({
  score,
  size = "md",
  showLabel = true,
  className,
}) {
  const { width, stroke, fontSize, labelSize } = sizeMap[size];
  const radius = (width - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (ringScore / 100) * circumference;
  const tier = resolveScoreTier(score);
  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  return (
    <div className={cn("flex flex-col items-center gap-1.5", className)}>
      <div className="relative" style={{ width, height: width }}>
        <svg width={width} height={width} className="-rotate-90">
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          <circle
            cx={width / 2}
            cy={width / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className={cn("font-bold leading-none text-[#1f2937]", fontSize)}
          >
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span
          className={cn(
            "inline-flex flex-col items-center rounded-md px-2.5 py-1 font-semibold leading-tight text-white",
            labelSize
          )}
          style={{ backgroundColor: color }}
          title={formatScoreRange(tier)}
        >
          {label}
          <span className="mt-0.5 block font-medium text-white/90">
            {formatScoreRange(tier)}
          </span>
        </span>
      )}
    </div>
  );
}
