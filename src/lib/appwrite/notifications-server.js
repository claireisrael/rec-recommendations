import "server-only";

import { appwriteConfig } from "./config";
import { reviewEmailHtml, reviewEmailText, sendReminderEmail } from "@/lib/email";
import { stampNotificationActor } from "@/lib/notification-actor";
import { getRoleUserByEmail, getRoleUserById } from "@/lib/roles";

/** @param {string} apiKey */
function appwriteHeaders(apiKey) {
  return {
    "Content-Type": "application/json",
    "X-Appwrite-Project": appwriteConfig.projectId,
    "X-Appwrite-Key": apiKey,
  };
}

function portalBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_BASE_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/**
 * @param {string | undefined | null} email
 * @returns {boolean}
 */
function isPlausibleEmail(email) {
  const e = (email || "").trim().toLowerCase();
  if (!e || e.length > 254) return false;
  // Basic RFC-ish check — reject placeholders that cause SMTP 550
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return false;
  if (
    e.includes("example.com") ||
    e.includes("replace-with") ||
    e.startsWith("test@") ||
    e.startsWith("noreply@localhost")
  ) {
    return false;
  }
  return true;
}

/**
 * Prefer the live Appwrite account email (real mailbox). Staff-config email is
 * only a fallback — wrong/stale addresses cause SMTP 550 "No Such User Here".
 * @param {string} apiKey
 * @param {string} userId
 * @param {string} [preferredEmail]
 * @returns {Promise<string | null>}
 */
async function resolveUserEmail(apiKey, userId, preferredEmail) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  try {
    const res = await fetch(`${endpoint}/users/${userId}`, {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    });
    if (res.ok) {
      const user = await res.json();
      if (isPlausibleEmail(user.email)) return String(user.email).trim();
    }
  } catch {
    /* fall through */
  }

  if (isPlausibleEmail(preferredEmail)) return preferredEmail.trim();

  const fromRoles = getRoleUserById(userId)?.email;
  if (isPlausibleEmail(fromRoles)) return fromRoles.trim();

  return null;
}

/**
 * @param {string} apiKey
 * @param {string} email
 * @returns {Promise<string | null>}
 */
export async function findUserIdByEmail(apiKey, email) {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;

  const known = getRoleUserByEmail(normalized);
  if (known?.userId) return known.userId;

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const query = JSON.stringify({
    method: "equal",
    attribute: "email",
    values: [normalized],
  });
  try {
    const res = await fetch(
      `${endpoint}/users?queries[]=${encodeURIComponent(query)}&queries[]=${encodeURIComponent(
        JSON.stringify({ method: "limit", values: [1] })
      )}`,
      {
        headers: appwriteHeaders(apiKey),
        cache: "no-store",
      }
    );
    if (!res.ok) return null;
    const body = await res.json();
    const user = body.users?.[0];
    return user?.$id || null;
  } catch {
    return null;
  }
}

/**
 * Resolve the live Appwrite user id (staff.json ids can drift from Auth).
 * @param {string} apiKey
 * @param {{ userId?: string; email?: string }} input
 * @returns {Promise<string>}
 */
async function resolveNotificationUserId(apiKey, input) {
  if (input.email) {
    const byEmail = await findUserIdByEmail(apiKey, input.email);
    if (byEmail) return byEmail;
  }
  return (input.userId || "").trim();
}

/**
 * List inbox notifications for one or more user ids (merged, deduped).
 * @param {string} apiKey
 * @param {string[]} userIds
 * @returns {Promise<import("./notification-types").AppNotification[]>}
 */
export async function listNotificationsForUserServer(apiKey, userIds) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const uniqueIds = [...new Set(userIds.filter(Boolean))];
  if (uniqueIds.length === 0) return [];

  /** @type {Map<string, import("./notification-types").AppNotification>} */
  const merged = new Map();

  for (const userId of uniqueIds) {
    const queries = [
      JSON.stringify({ method: "equal", attribute: "userId", values: [userId] }),
      JSON.stringify({ method: "orderDesc", attribute: "$createdAt" }),
      JSON.stringify({ method: "limit", values: [50] }),
    ];
    const qs = queries
      .map((q) => `queries[]=${encodeURIComponent(q)}`)
      .join("&");

    const res = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
      {
        headers: appwriteHeaders(apiKey),
        cache: "no-store",
      }
    );
    if (!res.ok) continue;

    const body = await res.json();
    for (const doc of body.documents || []) {
      if (doc.$id) merged.set(doc.$id, doc);
    }
  }

  return [...merged.values()]
    .sort(
      (a, b) =>
        new Date(b.$createdAt || 0).getTime() -
        new Date(a.$createdAt || 0).getTime()
    )
    .slice(0, 50);
}

/**
 * Remove leftover "Published" inbox cards (and optionally other closed types).
 * Publish already clears the action thread; old cards should not stay in Review.
 *
 * @param {string} apiKey
 * @param {string[]} userIds
 * @param {string[]} [types]
 * @returns {Promise<number>}
 */
export async function purgeNotificationTypesForUsers(
  apiKey,
  userIds,
  types = ["action_published"]
) {
  const typeSet = new Set(types);
  const docs = await listNotificationsForUserServer(apiKey, userIds);
  let deleted = 0;
  for (const doc of docs) {
    if (!doc.$id || !typeSet.has(doc.type)) continue;
    if (await deleteNotificationDocument(apiKey, doc.$id)) deleted += 1;
  }
  return deleted;
}

/**
 * @param {string} apiKey
 * @param {string[]} notificationIds
 * @param {Set<string>} allowedUserIds
 * @returns {Promise<number>}
 */
export async function markNotificationsReadServer(
  apiKey,
  notificationIds,
  allowedUserIds
) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  let marked = 0;

  for (const id of notificationIds.filter(Boolean)) {
    const getRes = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${id}`,
      { headers: appwriteHeaders(apiKey), cache: "no-store" }
    );
    if (!getRes.ok) continue;
    const doc = await getRes.json();
    if (!allowedUserIds.has(doc.userId)) continue;

    const patchRes = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${id}`,
      {
        method: "PATCH",
        headers: appwriteHeaders(apiKey),
        body: JSON.stringify({ data: { read: true } }),
      }
    );
    if (patchRes.ok) marked += 1;
  }

  return marked;
}

/**
 * Appwrite notifications collection string limits.
 * Exceeding these makes createDocument fail — and safeNotify was swallowing it,
 * so L1 / assignees saw nothing.
 */
const NOTIF_TITLE_MAX = 200;
const NOTIF_BODY_MAX = 1000;

/**
 * @param {string | undefined | null} value
 * @param {number} max
 */
function clipAttr(value, max) {
  const s = String(value ?? "").trim();
  if (s.length <= max) return s;
  return `${s.slice(0, Math.max(0, max - 1))}…`;
}

/**
 * @param {string} apiKey
 * @param {Omit<import("./notification-types").AppNotification, "$id" | "read" | "$createdAt"> & { read?: boolean }} input
 * @returns {Promise<void>}
 */
export async function createNotificationServer(apiKey, input) {
  if (!input.userId) {
    throw new Error("Cannot create notification without userId");
  }
  const stampedBody = stampNotificationActor(
    /** @type {{ actorName?: string }} */ (input).actorName,
    input.body
  );
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const res = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents`,
    {
      method: "POST",
      headers: appwriteHeaders(apiKey),
      body: JSON.stringify({
        documentId: "unique()",
        data: {
          userId: input.userId,
          type: clipAttr(input.type, 64),
          title: clipAttr(input.title, NOTIF_TITLE_MAX) || "REC Portal update",
          body:
            clipAttr(stampedBody, NOTIF_BODY_MAX) ||
            "Open the REC Portal to view this update.",
          ...(input.recommendationId
            ? { recommendationId: clipAttr(input.recommendationId, 64) }
            : {}),
          ...(input.actionId
            ? { actionId: clipAttr(input.actionId, 64) }
            : {}),
          read: input.read ?? false,
        },
        permissions: [
          `read("user:${input.userId}")`,
          `update("user:${input.userId}")`,
          `delete("user:${input.userId}")`,
        ],
      }),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      err.message || `Failed to create notification (${res.status})`
    );
  }
}

/**
 * Clear a user's open work item for this action (so it leaves their review queue).
 * Used after L1 approves / finishes — standard handoff off their desk.
 *
 * @param {string} apiKey
 * @param {{ userId: string; email?: string; recommendationId: string; actionId: string; types: import("./notification-types").NotificationType[] }} input
 * @returns {Promise<number>}
 */
export async function markActionNotificationsRead(apiKey, input) {
  const userIds = new Set([input.userId].filter(Boolean));
  if (input.email) {
    const live = await findUserIdByEmail(apiKey, input.email);
    if (live) userIds.add(live);
  }
  if (userIds.size === 0) return 0;

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const typeSet = new Set(input.types);
  let marked = 0;

  for (const userId of userIds) {
    const queries = [
      JSON.stringify({
        method: "equal",
        attribute: "userId",
        values: [userId],
      }),
      JSON.stringify({
        method: "equal",
        attribute: "recommendationId",
        values: [input.recommendationId],
      }),
      JSON.stringify({ method: "equal", attribute: "read", values: [false] }),
      JSON.stringify({ method: "limit", values: [50] }),
    ];
    const qs = queries
      .map((q) => `queries[]=${encodeURIComponent(q)}`)
      .join("&");

    const listRes = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
      {
        headers: appwriteHeaders(apiKey),
        cache: "no-store",
      }
    );
    if (!listRes.ok) continue;

    const body = await listRes.json();
    const docs = body.documents || [];

    for (const doc of docs) {
      if (!doc.$id || !typeSet.has(doc.type)) continue;
      if (input.actionId) {
        if (!doc.actionId || doc.actionId !== input.actionId) continue;
      }
      const patchRes = await fetch(
        `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${doc.$id}`,
        {
          method: "PATCH",
          headers: appwriteHeaders(apiKey),
          body: JSON.stringify({ data: { read: true } }),
        }
      );
      if (patchRes.ok) marked += 1;
    }
  }

  return marked;
}

/**
 * Clear every unread notification tied to this recommendation action (all users).
 * Used for non-publish handoffs. Prefer deleteActionNotificationThread on publish.
 *
 * @param {string} apiKey
 * @param {{ recommendationId: string; actionId: string }} input
 * @returns {Promise<number>}
 */
export async function markAllActionNotificationsRead(apiKey, input) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const queries = [
    JSON.stringify({
      method: "equal",
      attribute: "recommendationId",
      values: [input.recommendationId],
    }),
    JSON.stringify({ method: "equal", attribute: "read", values: [false] }),
    JSON.stringify({ method: "limit", values: [100] }),
  ];
  const qs = queries
    .map((q) => `queries[]=${encodeURIComponent(q)}`)
    .join("&");

  const listRes = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
    {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    }
  );
  if (!listRes.ok) return 0;

  const body = await listRes.json();
  const docs = body.documents || [];
  let marked = 0;

  for (const doc of docs) {
    if (!doc.$id) continue;
    if (input.actionId) {
      if (!doc.actionId || doc.actionId !== input.actionId) continue;
    }
    const patchRes = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${doc.$id}`,
      {
        method: "PATCH",
        headers: appwriteHeaders(apiKey),
        body: JSON.stringify({ data: { read: true } }),
      }
    );
    if (patchRes.ok) marked += 1;
  }

  return marked;
}

/**
 * @param {string} apiKey
 * @param {string} documentId
 * @returns {Promise<boolean>}
 */
async function deleteNotificationDocument(apiKey, documentId) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const delRes = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${documentId}`,
    {
      method: "DELETE",
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    }
  );
  return delRes.ok || delRes.status === 204;
}

/**
 * Delete one notification document only if it belongs to one of the allowed user ids.
 * Used for assignees — never touches other users' inboxes.
 *
 * @param {string} apiKey
 * @param {{ notificationId: string; allowedUserIds: string[] }} input
 * @returns {Promise<number>} 1 if deleted, else 0
 */
export async function deleteOwnNotificationDocument(apiKey, input) {
  const notificationId = String(input.notificationId || "").trim();
  const allowed = new Set(
    (input.allowedUserIds || []).map((id) => String(id || "").trim()).filter(Boolean)
  );
  if (!notificationId || allowed.size === 0) return 0;

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const getRes = await fetch(
    `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents/${notificationId}`,
    {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    }
  );
  if (!getRes.ok) return 0;

  const doc = await getRes.json();
  const ownerId = String(doc.userId || "").trim();
  if (!ownerId || !allowed.has(ownerId)) {
    console.warn(
      "[deleteOwnNotificationDocument] refused — not owned by caller",
      notificationId
    );
    return 0;
  }

  const ok = await deleteNotificationDocument(apiKey, notificationId);
  if (ok) {
    console.info("[deleteOwnNotificationDocument]", notificationId, "deleted");
    return 1;
  }
  return 0;
}

/**
 * Permanently remove the whole review-loop notification thread for one action
 * from every user's inbox (assignee, L1, final publisher — read and unread).
 * Strictly scoped to this actionId so sibling actions keep their threads.
 *
 * @param {string} apiKey
 * @param {{ recommendationId: string; actionId: string }} input
 * @returns {Promise<number>}
 */
export async function deleteActionNotificationThread(apiKey, input) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const actionId = String(input.actionId || "").trim();
  const recommendationId = String(input.recommendationId || "").trim();
  if (!actionId || !recommendationId) {
    console.warn(
      "[deleteActionNotificationThread] skipped — missing recommendationId or actionId"
    );
    return 0;
  }

  /** @type {Set<string>} */
  const toDelete = new Set();

  /**
   * Paginate and collect ids for this action only (never empty actionId rows).
   * @param {object[]} baseQueries
   * @param {(doc: Record<string, unknown>) => boolean} matches
   */
  async function collectFromQuery(baseQueries, matches) {
    for (let offset = 0; offset < 4000; offset += 100) {
      const queries = [
        ...baseQueries.map((q) => JSON.stringify(q)),
        JSON.stringify({ method: "limit", values: [100] }),
        JSON.stringify({ method: "offset", values: [offset] }),
      ];
      const qs = queries
        .map((q) => `queries[]=${encodeURIComponent(q)}`)
        .join("&");

      const listRes = await fetch(
        `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
        {
          headers: appwriteHeaders(apiKey),
          cache: "no-store",
        }
      );
      if (!listRes.ok) {
        console.error(
          "[deleteActionNotificationThread] list failed",
          listRes.status
        );
        break;
      }

      const body = await listRes.json();
      const docs = body.documents || [];
      if (docs.length === 0) break;

      for (const doc of docs) {
        if (doc.$id && matches(doc)) toDelete.add(String(doc.$id));
      }
      if (docs.length < 100) break;
    }
  }

  // Exact actionId — assignee, L1, publisher (any userId on the line).
  await collectFromQuery(
    [{ method: "equal", attribute: "actionId", values: [actionId] }],
    () => true
  );

  // Same recommendation + same actionId (belt-and-suspenders).
  await collectFromQuery(
    [
      {
        method: "equal",
        attribute: "recommendationId",
        values: [recommendationId],
      },
    ],
    (doc) => String(doc.actionId || "") === actionId
  );

  let deleted = 0;
  for (const id of toDelete) {
    if (await deleteNotificationDocument(apiKey, id)) deleted += 1;
  }

  console.info(
    "[deleteActionNotificationThread]",
    recommendationId,
    actionId,
    "candidates",
    toDelete.size,
    "deleted",
    deleted
  );
  return deleted;
}

/**
 * Delete notifications for one action, but only for specific inboxes.
 * Used when an L1 dismisses — never the final publisher.
 *
 * @param {string} apiKey
 * @param {{
 *   recommendationId: string;
 *   actionId: string;
 *   userIds: string[];
 *   notificationId?: string;
 *   onlyDocumentForUserIds?: string[];
 * }} input
 * @returns {Promise<number>}
 */
export async function deleteActionNotificationsForUserIds(apiKey, input) {
  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  const actionId = String(input.actionId || "").trim();
  const recommendationId = String(input.recommendationId || "").trim();
  const notificationId = String(input.notificationId || "").trim();
  const allowed = new Set(
    (input.userIds || []).map((id) => String(id || "").trim()).filter(Boolean)
  );
  const onlyDocUsers = new Set(
    (input.onlyDocumentForUserIds || [])
      .map((id) => String(id || "").trim())
      .filter(Boolean)
  );
  if (!actionId || !recommendationId || allowed.size === 0) {
    console.warn(
      "[deleteActionNotificationsForUserIds] skipped — missing scope"
    );
    return 0;
  }

  /** @type {Set<string>} */
  const toDelete = new Set();

  for (let offset = 0; offset < 4000; offset += 100) {
    const queries = [
      JSON.stringify({
        method: "equal",
        attribute: "actionId",
        values: [actionId],
      }),
      JSON.stringify({ method: "limit", values: [100] }),
      JSON.stringify({ method: "offset", values: [offset] }),
    ];
    const qs = queries
      .map((q) => `queries[]=${encodeURIComponent(q)}`)
      .join("&");

    const listRes = await fetch(
      `${endpoint}/databases/${appwriteConfig.databaseId}/collections/notifications/documents?${qs}`,
      {
        headers: appwriteHeaders(apiKey),
        cache: "no-store",
      }
    );
    if (!listRes.ok) {
      console.error(
        "[deleteActionNotificationsForUserIds] list failed",
        listRes.status
      );
      break;
    }

    const body = await listRes.json();
    const docs = body.documents || [];
    if (docs.length === 0) break;

    for (const doc of docs) {
      const uid = String(doc.userId || "").trim();
      const recId = String(doc.recommendationId || "").trim();
      const docId = String(doc.$id || "").trim();
      if (!docId || !uid || !allowed.has(uid)) continue;
      // Require matching recommendation — never delete on empty/other rec ids.
      if (recId !== recommendationId) continue;

      if (onlyDocUsers.has(uid)) {
        // L1: only the card they clicked — not their whole action thread.
        if (!notificationId || docId !== notificationId) continue;
      }

      toDelete.add(docId);
    }
    if (docs.length < 100) break;
  }

  let deleted = 0;
  for (const id of toDelete) {
    if (await deleteNotificationDocument(apiKey, id)) deleted += 1;
  }

  console.info(
    "[deleteActionNotificationsForUserIds]",
    recommendationId,
    actionId,
    "notificationId",
    notificationId || "(none)",
    "allowedUsers",
    allowed.size,
    "candidates",
    toDelete.size,
    "deleted",
    deleted
  );
  return deleted;
}

/**
 * @param {string} apiKey
 * @param {string} userId
 * @param {string} [preferredEmail]
 * @returns {Promise<string | undefined>}
 */
async function resolveUserDisplayName(apiKey, userId, preferredEmail) {
  const fromRoles = getRoleUserById(userId);
  if (fromRoles?.name) return fromRoles.name;
  if (preferredEmail) {
    const byEmail = getRoleUserByEmail(preferredEmail);
    if (byEmail?.name) return byEmail.name;
  }

  const endpoint = appwriteConfig.endpoint.replace(/\/$/, "");
  try {
    const res = await fetch(`${endpoint}/users/${userId}`, {
      headers: appwriteHeaders(apiKey),
      cache: "no-store",
    });
    if (!res.ok) return preferredEmail;
    const user = await res.json();
    return user.name || user.email || preferredEmail;
  } catch {
    return preferredEmail;
  }
}

/**
 * @param {string} apiKey
 * @param {Omit<import("./notification-types").AppNotification, "$id" | "read" | "$createdAt"> & { read?: boolean; email?: string }} input
 * @returns {Promise<void>}
 */
export async function notifyUser(apiKey, input) {
  const userId = await resolveNotificationUserId(apiKey, {
    userId: input.userId,
    email: input.email,
  });
  if (!userId) {
    console.error(
      "[notifyUser] missing userId for",
      input.type,
      input.email || "(no email)"
    );
    return;
  }

  // In-app first, unless skipInApp — publish clears the thread and
  // only emails so Published cards do not linger in Review inbox.
  if (!input.skipInApp) {
    try {
      await createNotificationServer(apiKey, { ...input, userId });
    } catch (e) {
      console.error(
        "[notifyUser] in-app failed",
        input.type,
        userId,
        e instanceof Error ? e.message : e
      );
    }
  }

  const to = await resolveUserEmail(apiKey, userId, input.email);
  if (!to || !isPlausibleEmail(to)) {
    if (to) {
      console.warn("[notifyUser] skipping email — implausible address:", to);
    }
    return;
  }

  const recipientName = await resolveUserDisplayName(apiKey, userId, to);

  const actionUrl = input.recommendationId
    ? `${portalBaseUrl()}/admin/${input.recommendationId}${
        input.actionId ? `?review=${encodeURIComponent(input.actionId)}` : ""
      }`
    : input.type === "responsibility_assigned"
      ? `${portalBaseUrl()}/admin/assignments`
      : `${portalBaseUrl()}/admin/reviews`;

  const mailContext = {
    title: input.title,
    body: input.body,
    actionUrl,
    recipientName,
    type: input.type,
    actorName: input.actorName,
    emailDetail: input.emailDetail,
  };

  try {
    const mail = await sendReminderEmail({
      to,
      subject: `[REC Portal] ${clipAttr(input.title, NOTIF_TITLE_MAX)}`,
      text: reviewEmailText(mailContext),
      html: reviewEmailHtml(mailContext),
    });
    if (mail.error) {
      console.warn("[notifyUser] email not delivered to", to, "—", mail.error);
    }
  } catch (e) {
    console.error(
      "[notifyUser] email failed",
      input.type,
      to,
      e instanceof Error ? e.message : e
    );
  }
}

/**
 * @param {string} apiKey
 * @param {{ email: string; userId?: string; type: import("./notification-types").NotificationType; title: string; body: string; linkPath?: string; recipientName?: string }} input
 * @returns {Promise<{ notified: boolean; inApp: boolean; emailed: boolean }>}
 */
export async function notifyByEmail(apiKey, input) {
  const email = input.email.trim();
  if (!email.includes("@")) {
    return { notified: false, inApp: false, emailed: false };
  }

  const userId = input.userId || (await findUserIdByEmail(apiKey, email));
  let inApp = false;

  if (userId) {
    try {
      await createNotificationServer(apiKey, {
        userId,
        type: input.type,
        title: input.title,
        body: input.body,
      });
      inApp = true;
    } catch (e) {
      console.error("[notifyByEmail] in-app failed", e);
    }
  }

  const actionUrl = `${portalBaseUrl()}${input.linkPath || "/admin/assignments"}`;
  const recipientName =
    input.recipientName ||
    (userId
      ? await resolveUserDisplayName(apiKey, userId, email)
      : email);

  const mailPayload = {
    title: input.title,
    body: input.body,
    actionUrl,
    recipientName,
    type: input.type,
  };

  const mail = await sendReminderEmail({
    to: email,
    subject: `[REC Portal] ${input.title}`,
    text: reviewEmailText(mailPayload),
    html: reviewEmailHtml(mailPayload),
  });

  return {
    notified: inApp || Boolean(mail.sent),
    inApp,
    emailed: Boolean(mail.sent),
  };
}
