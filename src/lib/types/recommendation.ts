import type { Models } from "appwrite";
import type { ScoreTierKey } from "@/lib/score";

export type RecommendationStatus = "planned" | "in_progress" | "completed";

export const RECOMMENDATION_STATUSES = [
  "planned",
  "in_progress",
  "completed",
] as const satisfies readonly RecommendationStatus[];

export const STATUS_LABELS: Record<RecommendationStatus, string> = {
  planned: "Planned",
  in_progress: "In Progress",
  completed: "Completed",
};

/** Distinct colors per status for buttons, badges, and indicators. */
export const STATUS_COLORS: Record<
  RecommendationStatus,
  { color: string; bg: string; border: string }
> = {
  planned: { color: "#64748b", bg: "#f1f5f9", border: "#cbd5e1" },
  in_progress: { color: "#B45309", bg: "#FEF3C7", border: "#FCD34D" },
  completed: { color: "#15803D", bg: "#DCFCE7", border: "#86EFAC" },
};

export interface ActionItem {
  text: string;
  scoreTier: ScoreTierKey;
  partner: string;
  evidence: string[];
}

export interface Recommendation extends Models.Document {
  recommendation: string;
  year: number;
  actions: ActionItem[];
  comments?: string;
  status: RecommendationStatus;
}

export interface RecommendationInput {
  recommendation: string;
  year: number;
  actions: ActionItem[];
  comments?: string;
  status: RecommendationStatus;
}

export interface RecommendationDocument extends Models.Document {
  recommendations: string;
  "rec-year": number;
  actionItems: string[];
  actionScores?: string[];
  actionPartners?: string[];
  actionEvidence?: string[];
  comments?: string;
  status: RecommendationStatus;
}

export interface YearStats {
  year: number;
  totalRecommendations: number;
  averageScore: number;
  totalActionPartners: number;
}

export interface GlobalStats {
  totalRecommendations: number;
  averageScore: number;
  totalActionPartners: number;
  yearRange: { min: number; max: number } | null;
}
