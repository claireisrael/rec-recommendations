"use client";

import type { Recommendation } from "@/lib/types/recommendation";
import { averageActionScore, getScoreColor } from "@/lib/score";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActionScoreDot } from "@/components/ui/score-badge";
import { ScoreRing } from "./ScoreRing";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { ActionPartnersDisplay } from "@/components/ui/action-partners";

interface RecommendationCardProps {
  recommendation: Recommendation;
  onClick: () => void;
}

export function RecommendationCard({
  recommendation,
  onClick,
}: RecommendationCardProps) {
  const overallScore = averageActionScore(recommendation.actions);

  return (
    <Card
      className="group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300 overflow-hidden"
      onClick={onClick}
    >
      <div className="h-1.5 gradient-card-header" />
      <CardContent className="p-5">
        <div className="flex items-start gap-4 mb-4">
          <ScoreRing score={overallScore} showLabel />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary">{recommendation.year}</Badge>
            </div>
            <h3 className="text-base font-bold text-primary leading-snug group-hover:text-primary-light transition-colors">
              {recommendation.recommendation}
            </h3>
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">
            Actions
          </p>
          <ul className="space-y-2">
            {recommendation.actions.map((action, i) => (
              <li
                key={i}
                className="rounded-lg px-3 py-2.5 space-y-2"
                style={{ backgroundColor: getScoreColor(action.scoreTier) }}
              >
                <div className="flex items-start gap-2 text-sm text-white">
                  <ActionScoreDot
                    scoreTier={action.scoreTier}
                    className="w-6 h-6 text-[10px] shrink-0 ring-2 ring-white/70"
                  />
                  <span className="flex-1 break-words leading-snug font-medium">
                    {action.text}
                  </span>
                </div>
                <div className="pl-8">
                  <ActionPartnersDisplay
                    partner={action.partner}
                    variant="onColor"
                  />
                </div>
                <div className="pl-8">
                  <ActionEvidenceDisplay evidence={action.evidence} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
