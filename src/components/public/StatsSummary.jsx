"use client";

import { Card, CardContent } from "@/components/ui/card";
import { ScoreGauge } from "./ScoreGauge";
import { BarChart3, Users, FileText } from "lucide-react";

/**
 * @param {{ stats: import("@/lib/types/recommendation").YearStats }} props
 */
export function StatsSummary({ stats }) {
  const cards = [
    {
      icon: BarChart3,
      label: "Average Score",
      content: <ScoreGauge score={stats.averageScore} size="sm" showLabel={false} />,
      accent: "border-l-secondary",
    },
    {
      icon: FileText,
      label: "Recommendations",
      content: (
        <span className="text-3xl font-bold text-primary">
          {stats.totalRecommendations}
        </span>
      ),
      accent: "border-l-primary",
    },
    {
      icon: Users,
      label: "Action Implementation Partners",
      content: (
        <span className="text-3xl font-bold text-primary">
          {stats.totalActionPartners}
        </span>
      ),
      accent: "border-l-secondary",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map(({ icon: Icon, label, content, accent }) => (
        <Card
          key={label}
          className={`border-l-4 ${accent} hover:shadow-md transition-shadow`}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-2.5 rounded-lg bg-primary/8">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted mb-1">{label}</p>
              {content}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
