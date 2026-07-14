"use client";

import type { Recommendation } from "@/lib/types/recommendation";
import { averageActionScore, getScoreColor, resolveScoreTier } from "@/lib/score";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreGauge } from "./ScoreGauge";
import { ScoreBadge, ActionScoreDot } from "@/components/ui/score-badge";
import { ActionEvidenceDisplay } from "@/components/ui/action-evidence";
import { ActionPartnersDisplay } from "@/components/ui/action-partners";
interface RecommendationModalProps {
  recommendation: Recommendation | null;
  open: boolean;
  onClose: () => void;
}

export function RecommendationModal({
  recommendation,
  open,
  onClose,
}: RecommendationModalProps) {
  if (!recommendation) return null;

  const overallScore = averageActionScore(recommendation.actions);

  return (
    <Dialog open={open} onClose={onClose}>
      <div className="p-6 md:p-8">
        <div className="flex items-start gap-6 mb-6 pr-8">
          <ScoreGauge score={overallScore} size="md" />
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="secondary">{recommendation.year}</Badge>
              <ScoreBadge scoreTier={resolveScoreTier(overallScore).key} showValue size="md" />
            </div>
            <h2 className="text-2xl font-bold text-primary leading-tight">
              {recommendation.recommendation}
            </h2>
          </div>
        </div>

        <div className="space-y-6">
          <section>
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
              Actions &amp; Action Implementation Partners
            </h3>
            <ol className="space-y-2">
              {recommendation.actions.map((action, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-white rounded-xl p-3"
                  style={{ backgroundColor: getScoreColor(action.scoreTier) }}
                >
                  <ActionScoreDot
                    scoreTier={action.scoreTier}
                    className="ring-2 ring-white/70"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <p className="font-medium">{action.text}</p>
                    <ActionPartnersDisplay
                      partner={action.partner}
                      variant="onColor"
                      size="md"
                    />
                    <ActionEvidenceDisplay evidence={action.evidence} size="md" />
                  </div>
                  <ScoreBadge scoreTier={action.scoreTier} size="sm" />
                </li>
              ))}
            </ol>
          </section>

          {recommendation.comments && (
            <section>
              <h3 className="text-sm font-semibold text-muted uppercase tracking-wide mb-2">
                Notes
              </h3>
              <p className="text-sm font-light text-gray-600 italic">
                {recommendation.comments}
              </p>
            </section>
          )}
        </div>

        <div className="mt-8 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
