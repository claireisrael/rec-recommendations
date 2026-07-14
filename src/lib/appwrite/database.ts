import { Query } from "appwrite";
import { getDatabases, createServerClient, isAppwriteConfigured } from "./client";
import { appwriteConfig } from "./config";
import { countUniqueActionPartners, DEFAULT_TIER, resolveScoreTier, getTierByKey } from "@/lib/score";
import { parseActionEvidence, serializeActionEvidence } from "@/lib/evidence";
import type {
  Recommendation,
  RecommendationInput,
  RecommendationDocument,
  RecommendationStatus,
  YearStats,
  GlobalStats,
} from "@/lib/types/recommendation";

const { databaseId, collectionId } = appwriteConfig;

// The Appwrite `status` enum uses a hyphen ("in-progress"), while the app uses
// an underscore ("in_progress"). Map between the two at the data boundary.
function toAppwriteStatus(status: RecommendationStatus): string {
  return status === "in_progress" ? "in-progress" : status;
}

function fromAppwriteStatus(raw: string | undefined): RecommendationStatus {
  return raw === "in-progress"
    ? "in_progress"
    : (raw as RecommendationStatus) ?? "planned";
}

function getDatabasesInstance(serverSide = false) {
  if (serverSide) {
    return createServerClient().databases;
  }
  return getDatabases();
}

function normalizeDocument(raw: RecommendationDocument): Recommendation {
  const texts = raw.actionItems ?? [];
  const scores = raw.actionScores ?? [];
  const partners = raw.actionPartners ?? [];
  const evidence = raw.actionEvidence ?? [];
  return {
    $id: raw.$id,
    $sequence: raw.$sequence,
    $collectionId: raw.$collectionId,
    $databaseId: raw.$databaseId,
    $createdAt: raw.$createdAt,
    $updatedAt: raw.$updatedAt,
    $permissions: raw.$permissions,
    recommendation: raw.recommendations,
    year: raw["rec-year"],
    actions: texts.map((text, i) => ({
      text,
      scoreTier: resolveScoreTier(scores[i] ?? DEFAULT_TIER.key).key,
      partner: partners[i] ?? "",
      evidence: parseActionEvidence(evidence[i]),
    })),
    comments: raw.comments,
    status: fromAppwriteStatus(raw.status),
  };
}

function toAppwritePayload(
  data: Partial<RecommendationInput>
): Partial<RecommendationDocument> {
  const payload: Partial<RecommendationDocument> = {};

  if (data.recommendation !== undefined) {
    payload.recommendations = data.recommendation;
  }
  if (data.year !== undefined) {
    payload["rec-year"] = data.year;
  }
  if (data.comments !== undefined) {
    payload.comments = data.comments;
  }
  if (data.status !== undefined) {
    payload.status = toAppwriteStatus(data.status) as RecommendationStatus;
  }
  if (data.actions) {
    payload.actionItems = data.actions.map((a) => a.text);
    payload.actionScores = data.actions.map((a) => a.scoreTier);
    payload.actionPartners = data.actions.map((a) => a.partner);
    payload.actionEvidence = data.actions.map((a) =>
      serializeActionEvidence(a.evidence ?? [])
    );
  }

  return payload;
}

export async function getRecommendations(
  filters: { year?: number; status?: string } = {},
  serverSide = false
): Promise<Recommendation[]> {
  if (!isAppwriteConfigured()) return [];

  const queries: string[] = [Query.orderDesc("rec-year"), Query.limit(500)];

  if (filters.year !== undefined) {
    queries.push(Query.equal("rec-year", filters.year));
  }
  if (filters.status) {
    queries.push(
      Query.equal(
        "status",
        toAppwriteStatus(filters.status as RecommendationStatus)
      )
    );
  }

  const db = getDatabasesInstance(serverSide);
  const response = await db.listDocuments<RecommendationDocument>(
    databaseId,
    collectionId,
    queries
  );

  return response.documents.map(normalizeDocument);
}

export async function getRecommendationById(
  id: string,
  serverSide = false
): Promise<Recommendation> {
  const db = getDatabasesInstance(serverSide);
  const doc = await db.getDocument<RecommendationDocument>(
    databaseId,
    collectionId,
    id
  );
  return normalizeDocument(doc);
}

export async function createRecommendation(
  data: RecommendationInput
): Promise<Recommendation> {
  const doc = await getDatabases().createDocument<RecommendationDocument>(
    databaseId,
    collectionId,
    "unique()",
    toAppwritePayload(data) as Omit<
      RecommendationDocument,
      keyof import("appwrite").Models.Document
    >
  );
  return normalizeDocument(doc);
}

export async function updateRecommendation(
  id: string,
  data: Partial<RecommendationInput>
): Promise<Recommendation> {
  const doc = await getDatabases().updateDocument<RecommendationDocument>(
    databaseId,
    collectionId,
    id,
    toAppwritePayload(data) as Partial<
      Omit<RecommendationDocument, keyof import("appwrite").Models.Document>
    >
  );
  return normalizeDocument(doc);
}

export async function deleteRecommendation(id: string): Promise<void> {
  await getDatabases().deleteDocument(databaseId, collectionId, id);
}

export async function getAvailableYears(
  status?: string,
  serverSide = false
): Promise<number[]> {
  const recommendations = await getRecommendations(
    status ? { status } : {},
    serverSide
  );
  const years = [...new Set(recommendations.map((r) => r.year))];
  return years.sort((a, b) => b - a);
}

export async function getStatsByYear(
  year: number,
  serverSide = false
): Promise<YearStats> {
  const recommendations = await getRecommendations({ year }, serverSide);

  const allActionScores = recommendations.flatMap((r) =>
    r.actions.map((a) => getTierByKey(a.scoreTier).value)
  );
  const averageScore =
    allActionScores.length > 0
      ? Math.round(
          allActionScores.reduce((sum, s) => sum + s, 0) / allActionScores.length
        )
      : 0;

  return {
    year,
    totalRecommendations: recommendations.length,
    averageScore,
    totalActionPartners: countUniqueActionPartners(recommendations),
  };
}

export async function getGlobalStats(
  serverSide = false
): Promise<GlobalStats> {
  const recommendations = await getRecommendations({}, serverSide);

  const allActionScores = recommendations.flatMap((r) =>
    r.actions.map((a) => getTierByKey(a.scoreTier).value)
  );
  const years = recommendations.map((r) => r.year);
  const averageScore =
    allActionScores.length > 0
      ? Math.round(
          allActionScores.reduce((sum, s) => sum + s, 0) / allActionScores.length
        )
      : 0;

  return {
    totalRecommendations: recommendations.length,
    averageScore,
    totalActionPartners: countUniqueActionPartners(recommendations),
    yearRange:
      years.length > 0
        ? { min: Math.min(...years), max: Math.max(...years) }
        : null,
  };
}

export function getYearCounts(
  recommendations: Recommendation[]
): Record<number, number> {
  return recommendations.reduce<Record<number, number>>((acc, rec) => {
    acc[rec.year] = (acc[rec.year] ?? 0) + 1;
    return acc;
  }, {});
}
