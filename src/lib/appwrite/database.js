import { Query } from "appwrite";
import { getAccount, getDatabases, createServerClient, isAppwriteConfigured } from "./client";
import { appwriteConfig } from "./config";
import {
  countUniqueActionPartners,
  DEFAULT_TIER,
  resolveScoreTier,
  toScoreTierKey,
} from "@/lib/score";
import { parseActionEvidence, serializeActionEvidence } from "@/lib/evidence";
import { resolveCategory } from "@/lib/categories";
import {
  createActionId,
  defaultActionReviewMeta,
  parseActionReview,
  serializeActionReview,
} from "@/lib/action-review";

/**
 * @typedef {import("@/lib/types/recommendation").Recommendation} Recommendation
 * @typedef {import("@/lib/types/recommendation").RecommendationInput} RecommendationInput
 * @typedef {import("@/lib/types/recommendation").RecommendationDocument} RecommendationDocument
 * @typedef {import("@/lib/types/recommendation").RecommendationStatus} RecommendationStatus
 * @typedef {import("@/lib/types/recommendation").YearStats} YearStats
 * @typedef {import("@/lib/types/recommendation").GlobalStats} GlobalStats
 */

const { databaseId, collectionId } = appwriteConfig;

// The Appwrite `status` enum uses a hyphen ("in-progress"), while the app uses
// an underscore ("in_progress"). Map between the two at the data boundary.
/** @param {RecommendationStatus} status */
function toAppwriteStatus(status) {
  return status === "in_progress" ? "in-progress" : status;
}

/** @param {string | undefined} raw @returns {RecommendationStatus} */
function fromAppwriteStatus(raw) {
  return raw === "in-progress" ? "in_progress" : raw ?? "planned";
}

/** @param {boolean} [serverSide] */
function getDatabasesInstance(serverSide = false) {
  if (serverSide) {
    return createServerClient().databases;
  }
  return getDatabases();
}

/** @param {RecommendationDocument} raw @returns {Recommendation} */
function normalizeDocument(raw) {
  const texts = raw.actionItems ?? [];
  const scores = raw.actionScores ?? [];
  const partners = raw.actionPartners ?? [];
  const evidence = raw.actionEvidence ?? [];
  const reviews = raw.actionReviews ?? [];
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
    category: resolveCategory(raw.category ?? raw.comments),
    sectionCode: raw.sectionCode || undefined,
    actions: texts.map((text, i) => {
      const review = parseActionReview(reviews[i]);
      // Stable across reloads so L1/superadmin approve can find the row
      const id = review.id || `action-${raw.$id}-${i}`;
      return {
        id,
        text,
        scoreTier: toScoreTierKey(scores[i] ?? DEFAULT_TIER.key),
        partner: partners[i] ?? "",
        evidence: parseActionEvidence(evidence[i]),
        review: { ...review, id },
      };
    }),
    comments: raw.comments,
    status: fromAppwriteStatus(raw.status),
  };
}

/** @param {Partial<RecommendationInput>} data @returns {Partial<RecommendationDocument>} */
function toAppwritePayload(data) {
  /** @type {Partial<RecommendationDocument>} */
  const payload = {};

  if (data.recommendation !== undefined) {
    payload.recommendations = data.recommendation;
  }
  if (data.year !== undefined) {
    payload["rec-year"] = data.year;
  }
  if (data.category !== undefined) {
    payload.category = data.category;
  }
  if (data.sectionCode !== undefined) {
    payload.sectionCode = data.sectionCode || "";
  }
  if (data.comments !== undefined) {
    payload.comments = data.comments;
  }
  if (data.status !== undefined) {
    payload.status = toAppwriteStatus(data.status);
  }
  if (data.actions) {
    payload.actionItems = data.actions.map((a) => a.text);
    payload.actionScores = data.actions.map((a) => a.scoreTier);
    payload.actionPartners = data.actions.map((a) => a.partner);
    payload.actionEvidence = data.actions.map((a) =>
      serializeActionEvidence(a.evidence ?? [])
    );
    payload.actionReviews = data.actions.map((a) =>
      serializeActionReview(
        a.review?.id
          ? a.review
          : defaultActionReviewMeta({ id: a.id || createActionId() })
      )
    );
  }

  return payload;
}

/**
 * @param {{ year?: number; status?: string }} [filters]
 * @param {boolean} [serverSide]
 * @returns {Promise<Recommendation[]>}
 */
export async function getRecommendations(filters = {}, serverSide = false) {
  if (!isAppwriteConfigured()) return [];

  /** @type {string[]} */
  const queries = [Query.orderDesc("rec-year"), Query.limit(500)];

  if (filters.year !== undefined) {
    queries.push(Query.equal("rec-year", filters.year));
  }
  if (filters.status) {
    queries.push(
      Query.equal("status", toAppwriteStatus(filters.status))
    );
  }

  const db = getDatabasesInstance(serverSide);
  const response = await db.listDocuments(
    databaseId,
    collectionId,
    queries
  );

  return response.documents.map(normalizeDocument);
}

/**
 * @param {string} id
 * @param {boolean} [serverSide]
 * @returns {Promise<Recommendation>}
 */
export async function getRecommendationById(id, serverSide = false) {
  const db = getDatabasesInstance(serverSide);
  const doc = await db.getDocument(databaseId, collectionId, id);
  return normalizeDocument(doc);
}

/** @param {RecommendationInput} data @returns {Promise<Recommendation>} */
export async function createRecommendation(data) {
  const doc = await getDatabases().createDocument(
    databaseId,
    collectionId,
    "unique()",
    toAppwritePayload(data)
  );
  return normalizeDocument(doc);
}

/**
 * @param {string} id
 * @param {Partial<RecommendationInput>} data
 * @returns {Promise<Recommendation>}
 */
export async function updateRecommendation(id, data) {
  const payload = toAppwritePayload(data);

  if (typeof window !== "undefined") {
    const jwt = await getAccount().createJWT();
    const res = await fetch(`/api/admin/recommendations/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-JWT": jwt.jwt,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Failed to update (${res.status})`);
    }
    const raw = await res.json();
    return normalizeDocument(raw);
  }

  const doc = await getDatabases().updateDocument(
    databaseId,
    collectionId,
    id,
    payload
  );
  return normalizeDocument(doc);
}

/** @param {string} id @returns {Promise<void>} */
export async function deleteRecommendation(id) {
  // Prefer server delete (API key) so Appwrite is always updated, even when
  // document permissions would block the browser session.
  if (typeof window !== "undefined") {
    const jwt = await getAccount().createJWT();
    const res = await fetch(`/api/admin/recommendations/${id}`, {
      method: "DELETE",
      headers: {
        "X-Appwrite-JWT": jwt.jwt,
      },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `Failed to delete (${res.status})`);
    }
    return;
  }

  // Server-side fallback (scripts / RSC) — needs API key on env via REST path
  // or the Appwrite client without a user session will fail. Prefer scripts.
  await getDatabases().deleteDocument(databaseId, collectionId, id);
}

/**
 * @param {string} [status]
 * @param {boolean} [serverSide]
 * @returns {Promise<number[]>}
 */
export async function getAvailableYears(status, serverSide = false) {
  const recommendations = await getRecommendations(
    status ? { status } : {},
    serverSide
  );
  const years = [...new Set(recommendations.map((r) => r.year))];
  return years.sort((a, b) => b - a);
}

/**
 * @param {number} year
 * @param {boolean} [serverSide]
 * @returns {Promise<YearStats>}
 */
export async function getStatsByYear(year, serverSide = false) {
  const recommendations = await getRecommendations({ year }, serverSide);

  const allActionScores = recommendations.flatMap((r) =>
    r.actions.map((a) => resolveScoreTier(a.scoreTier).value)
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

/** @param {boolean} [serverSide] @returns {Promise<GlobalStats>} */
export async function getGlobalStats(serverSide = false) {
  const recommendations = await getRecommendations({}, serverSide);

  const allActionScores = recommendations.flatMap((r) =>
    r.actions.map((a) => resolveScoreTier(a.scoreTier).value)
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

/** @param {Recommendation[]} recommendations @returns {Record<number, number>} */
export function getYearCounts(recommendations) {
  return recommendations.reduce((acc, rec) => {
    acc[rec.year] = (acc[rec.year] ?? 0) + 1;
    return acc;
  }, /** @type {Record<number, number>} */ ({}));
}
