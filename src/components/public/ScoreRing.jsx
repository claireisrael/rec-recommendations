"use client";

import { getScoreColor, getScoreLabel } from "@/lib/score";

/**
 * @param {{ score: number, size?: number, showLabel?: boolean }} props
 */
export function ScoreRing({ score, size = 64, showLabel = false }) {
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ringScore = Math.max(0, Math.min(100, score));
  const offset = circumference - (ringScore / 100) * circumference;
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
          <span className="text-sm font-bold text-[#1f2937]">{score}</span>
        </div>
      </div>
      {showLabel && (
        <span
          className="rounded px-1.5 py-0.5 text-[10px] font-semibold text-white"
          style={{ backgroundColor: color }}
        >
          {getScoreLabel(score)}
        </span>
      )}
    </div>
  );
}
