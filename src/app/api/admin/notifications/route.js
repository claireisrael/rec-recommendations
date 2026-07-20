import { NextResponse } from "next/server";
import {
  listNotificationsForUserServer,
  markNotificationsReadServer,
  purgeNotificationTypesForUsers,
  deleteActionNotificationThread,
  deleteActionNotificationsForUserIds,
  deleteOwnNotificationDocument,
} from "@/lib/appwrite/notifications-server";
import { getRecommendationById } from "@/lib/appwrite/database";
import { parseActionReview, defaultActionReviewMeta } from "@/lib/action-review";
import {
  getFinalPublisherUser,
  getRoleUserByEmail,
  getRoleUserById,
  isFinalPublisher,
  isL1Reviewer,
} from "@/lib/roles";

function env() {
  return {
    endpoint: (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
      /\/$/,
      ""
    ),
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
    apiKey: process.env.APPWRITE_API_KEY || "",
  };
}

async function getAccount(endpoint, projectId, jwt) {
  const res = await fetch(`${endpoint}/account`, {
    headers: {
      "X-Appwrite-Project": projectId,
      "X-Appwrite-JWT": jwt,
    },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return res.json();
}

function jwtFromRequest(request) {
  return (
    request.headers.get("x-appwrite-jwt") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    ""
  );
}

/** Resolve every user id that might own this person's inbox (Auth + staff config). */
function inboxUserIds(account) {
  const ids = new Set();
  if (account?.$id) ids.add(account.$id);
  const staff = getRoleUserByEmail(account?.email);
  if (staff?.userId) ids.add(staff.userId);
  return ids;
}

/**
 * @param {string | undefined | null} userId
 * @param {string | undefined | null} email
 * @returns {Set<string>}
 */
function personUserIds(userId, email) {
  const ids = new Set();
  const uid = String(userId || "").trim();
  if (uid) ids.add(uid);
  const byId = uid ? getRoleUserById(uid) : undefined;
  if (byId?.userId) ids.add(String(byId.userId));
  const byEmail = getRoleUserByEmail(email);
  if (byEmail?.userId) ids.add(String(byEmail.userId));
  return ids;
}

/** Final publisher inbox ids — never wiped by an L1 dismiss. */
function finalPublisherUserIds() {
  const pub = getFinalPublisherUser();
  return personUserIds(pub?.userId, pub?.email);
}

/**
 * @param {string} recommendationId
 * @param {string} actionId
 * @returns {Promise<Set<string>>}
 */
async function assigneeUserIdsForAction(recommendationId, actionId) {
  try {
    const doc = await getRecommendationById(recommendationId, true);
    const reviews = doc?.actionReviews || [];
    for (const raw of reviews) {
      const meta =
        typeof raw === "string"
          ? parseActionReview(raw)
          : defaultActionReviewMeta(
              /** @type {Partial<import("@/lib/action-review").ActionReviewMeta>} */ (
                raw || {}
              )
            );
      if (String(meta.id || "") === actionId) {
        return personUserIds(meta.submitterId, meta.submitterEmail);
      }
    }
  } catch (e) {
    console.warn(
      "[notifications DELETE] could not load assignee for action",
      actionId,
      e instanceof Error ? e.message : e
    );
  }
  return new Set();
}

export async function GET(request) {
  const cfg = env();
  if (!cfg.endpoint || !cfg.projectId || !cfg.apiKey) {
    return NextResponse.json(
      { message: "Appwrite not configured" },
      { status: 500 }
    );
  }

  const jwt = jwtFromRequest(request);
  if (!jwt) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const account = await getAccount(cfg.endpoint, cfg.projectId, jwt);
  if (!account?.$id) {
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  const userIds = [...inboxUserIds(account)];
  // Drop leftover Published cards — publish clears the thread; inbox is for open work.
  await purgeNotificationTypesForUsers(cfg.apiKey, userIds, ["action_published"]);
  const items = await listNotificationsForUserServer(cfg.apiKey, userIds);
  return NextResponse.json({ items, userIds });
}

export async function PATCH(request) {
  const cfg = env();
  if (!cfg.endpoint || !cfg.projectId || !cfg.apiKey) {
    return NextResponse.json(
      { message: "Appwrite not configured" },
      { status: 500 }
    );
  }

  const jwt = jwtFromRequest(request);
  if (!jwt) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const account = await getAccount(cfg.endpoint, cfg.projectId, jwt);
  if (!account?.$id) {
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const ids = Array.isArray(body?.ids) ? body.ids : [];
  const allowed = inboxUserIds(account);
  const marked = await markNotificationsReadServer(cfg.apiKey, ids, allowed);
  return NextResponse.json({ marked });
}

/**
 * Dismiss notifications:
 * - Final publisher: wipe the full action thread (all levels).
 * - L1 reviewer: clicked card only + assignee cards for that action (not publisher).
 * - Assignee / others: clicked card only — never other levels.
 */
export async function DELETE(request) {
  const cfg = env();
  if (!cfg.endpoint || !cfg.projectId || !cfg.apiKey) {
    return NextResponse.json(
      { message: "Appwrite not configured" },
      { status: 500 }
    );
  }

  const jwt = jwtFromRequest(request);
  if (!jwt) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const account = await getAccount(cfg.endpoint, cfg.projectId, jwt);
  if (!account?.$id) {
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
  }

  const recommendationId = String(body?.recommendationId || "").trim();
  const actionId = String(body?.actionId || "").trim();
  const notificationId = String(body?.notificationId || "").trim();
  if (!recommendationId || !actionId) {
    return NextResponse.json(
      { message: "recommendationId and actionId are required" },
      { status: 400 }
    );
  }

  const asPublisher = isFinalPublisher(account.email);
  const asL1 = isL1Reviewer(account.email);
  const actorIds = [...inboxUserIds(account)];
  const inbox = await listNotificationsForUserServer(cfg.apiKey, actorIds);

  if (asPublisher) {
    const owns = inbox.some(
      (n) =>
        String(n.recommendationId || "") === recommendationId &&
        String(n.actionId || "") === actionId
    );
    if (!owns) {
      return NextResponse.json(
        { message: "No matching notification in your inbox" },
        { status: 404 }
      );
    }
    const deleted = await deleteActionNotificationThread(cfg.apiKey, {
      recommendationId,
      actionId,
    });
    return NextResponse.json({ deleted, scope: "full" });
  }

  if (!notificationId) {
    return NextResponse.json(
      { message: "notificationId is required" },
      { status: 400 }
    );
  }

  const ownsClicked = inbox.some(
    (n) =>
      String(n.$id || "") === notificationId &&
      String(n.recommendationId || "") === recommendationId &&
      String(n.actionId || "") === actionId
  );
  if (!ownsClicked) {
    return NextResponse.json(
      { message: "Notification not found in your inbox" },
      { status: 404 }
    );
  }

  // Assignee (and any non-L1): only their own clicked card.
  if (!asL1) {
    const deleted = await deleteOwnNotificationDocument(cfg.apiKey, {
      notificationId,
      allowedUserIds: actorIds,
    });
    return NextResponse.json({ deleted, scope: "own" });
  }

  // L1: clicked card for self + assignee's cards for this action. Never publisher.
  const protectedIds = finalPublisherUserIds();
  const assigneeIds = await assigneeUserIdsForAction(recommendationId, actionId);

  /** @type {Set<string>} */
  const actorScoped = new Set();
  for (const id of actorIds) {
    if (!protectedIds.has(id)) actorScoped.add(id);
  }

  /** @type {Set<string>} */
  const assigneeScoped = new Set();
  for (const id of assigneeIds) {
    if (!protectedIds.has(id) && !actorScoped.has(id)) assigneeScoped.add(id);
  }

  /** @type {Set<string>} */
  const allScoped = new Set([...actorScoped, ...assigneeScoped]);
  if (allScoped.size === 0) {
    return NextResponse.json({ deleted: 0, scope: "l1_assignee" });
  }

  const deleted = await deleteActionNotificationsForUserIds(cfg.apiKey, {
    recommendationId,
    actionId,
    userIds: [...allScoped],
    notificationId,
    onlyDocumentForUserIds: [...actorScoped],
  });
  return NextResponse.json({ deleted, scope: "l1_assignee" });
}
