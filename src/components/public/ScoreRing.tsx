"use client";

import { getScoreColor, getScoreLabel } from "@/lib/score";

interface ScoreRingProps {
  score: number;
  size?: number;
  showLabel?: boolean;
}

export function ScoreRing({ score, size = 64, showLabel = false }: ScoreRingProps) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = getScoreColor(score);

  return (
    <div className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e2e8f0"
            strokeWidth={stroke}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      {showLabel && (
        <span className="text-[10px] font-semibold" style={{ color }}>
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}
