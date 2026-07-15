import type { Models } from "appwrite";
import type { ScoreTierKey } from "@/lib/score";
import type { RecommendationCategory } from "@/lib/categories";
import type { ActionReviewMeta } from "@/lib/action-review";

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
/** Clear status chips — readable on white tables (HR-style). */
export const STATUS_COLORS: Record<
  RecommendationStatus,
  { color: string; bg: string; border: string }
> = {
  planned: { color: "#054653", bg: "rgba(5,70,83,0.08)", border: "rgba(5,70,83,0.18)" },
  in_progress: { color: "#92400e", bg: "#fef3c7", border: "#fcd34d" },
  completed: { color: "#166534", bg: "#dcfce7", border: "#86efac" },
};

export interface ActionItem {
  /** Stable id for review workflow */
  id: string;
  text: string;
  scoreTier: ScoreTierKey;
  partner: string;
  evidence: string[];
  review: ActionReviewMeta;
}

export interface Recommendation extends Models.Document {
  recommendation: string;
  year: number;
  category: RecommendationCategory;
  /**
   * Section root the assignee owns (e.g. "6.9").
   * Recommendations under it number as 6.9.1, 6.9.2, …
   */
  sectionCode?: string;
  actions: ActionItem[];
  comments?: string;
  status: RecommendationStatus;
}

export interface RecommendationInput {
  recommendation: string;
  year: number;
  category: RecommendationCategory;
  sectionCode?: string;
  actions: ActionItem[];
  comments?: string;
  status: RecommendationStatus;
}

export interface RecommendationDocument extends Models.Document {
  recommendations: string;
  "rec-year": number;
  category?: string;
  /** Section root e.g. "6.9" */
  sectionCode?: string;
  actionItems: string[];
  actionScores?: string[];
  actionPartners?: string[];
  actionEvidence?: string[];
  /** JSON blob per action — review workflow metadata */
  actionReviews?: string[];
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
