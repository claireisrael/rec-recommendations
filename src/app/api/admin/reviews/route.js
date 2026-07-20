import { NextResponse } from "next/server";
import { ACTION_REVIEW_STATUSES } from "@/lib/action-review";
import {
  findUserIdByEmail,
  markActionNotificationsRead,
  deleteActionNotificationThread,
  notifyUser,
} from "@/lib/appwrite/notifications-server";
import {
  canChooseL1Approver,
  getAssignableL1Reviewers,
  getDesignatedL1Reviewer,
  getFinalPublisherDisplayName,
  getFinalPublisherUser,
  getRoleUserById,
  isFinalPublisher,
  isL1Reviewer,
  normalizeEmail,
  resolveStaffDisplayName,
} from "@/lib/roles";
import { toScoreTierKey } from "@/lib/score";
import { CATEGORY_LABELS, resolveCategory } from "@/lib/categories";
import { buildReviewNotifyCopy } from "@/lib/review-notify-copy";
import {
  buildRecommendationNumbering,
  getCategoryCode,
  getSectionRootFromCode,
} from "@/lib/numbering";
import {
  getAssigneesForCode,
  getAssigneesForSection,
} from "@/lib/recommendation-assignees";
import {
  serializeActionEvidence,
} from "@/lib/evidence";

/** Accept REC enum keys (and temporary Matrix drift keys via toScoreTierKey). */
function normalizeScoreKey(raw) {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (!s) return null;
  return toScoreTierKey(s);
}

/**
 * Who must be told when changes are requested:
 * Prefer the submitter only. Fall back to section owners only when no
 * submitter is recorded (keeps 6.1 mail off Clare — she owns 6.5/6.6).
 * @param {string} apiKey
 * @param {Record<string, unknown>} meta
 * @param {Record<string, unknown>} doc
 * @param {string} [excludeUserId]
 * @returns {Promise<Array<{ userId: string; email?: string; name?: string }>>}
 */
async function resolveChangeRecipients(
  apiKey,
  meta,
  doc,
  excludeUserId
) {
  const byId = new Map();

  const add = (userId, email, name) => {
    if (!userId || userId === excludeUserId) return;
    const prev = byId.get(userId);
    byId.set(userId, {
      userId,
      email: email || prev?.email,
      name: name || prev?.name,
    });
  };

  const submitterId =
    typeof meta.submitterId === "string" ? meta.submitterId.trim() : undefined;
  const submitterEmail =
    typeof meta.submitterEmail === "string" ? meta.submitterEmail.trim() : undefined;
  const submitterName =
    typeof meta.submitterName === "string" ? meta.submitterName.trim() : undefined;

  if (submitterId) {
    add(submitterId, submitterEmail, submitterName);
    return [...byId.values()];
  }
  if (submitterEmail) {
    const found = await findUserIdByEmail(apiKey, submitterEmail);
    if (found) {
      add(found, submitterEmail, submitterName);
      return [...byId.values()];
    }
  }

  const category = resolveCategory(
    doc.category || doc.comments
  );
  const section =
    (typeof doc.sectionCode === "string" && doc.sectionCode.trim()) ||
    getSectionRootFromCode(String(doc.sectionCode || "")) ||
    getCategoryCode(category);
  const code =
    (typeof doc.code === "string" && doc.code.trim()) ||
    section;

  // Prefer item-level owners (e.g. 6.3.1), then section owners (e.g. 6.3)
  const owners = [
    ...getAssigneesForCode(code),
    ...(section ? getAssigneesForSection(section) : []),
  ];
  for (const a of owners) {
    add(a.userId, a.email, a.name);
  }

  return [...byId.values()];
}

/** Notifications must never block persisting review state. */
async function safeNotify(fn) {
  try {
    await fn();
  } catch {
    /* best-effort */
  }
}

async function notifyChangesRequested(
  apiKey,
  targets,
  input
) {
  if (targets.length === 0) {
    throw new Error(
      "No submitter or section owner found to notify. Changes were not recorded."
    );
  }

  const copySet = buildReviewNotifyCopy(
    {
      displayCode: input.displayCode,
      headline: input.headline,
      detail: input.detail,
      actionNo: input.actionNo,
      actionText: input.actionText,
    },
    {
      actorName: input.actorName,
      publisherName: input.publisherName || "the final publisher",
      remark: input.remark,
    }
  );
  const copy =
    input.actorRole === "l1"
      ? copySet.changesRequestedL1
      : copySet.changesRequestedPublisher;

  const errors = [];

  for (const t of targets) {
    try {
      await notifyUser(apiKey, {
        userId: t.userId,
        email: t.email,
        actorName: input.actorName,
        type: "changes_requested",
        title: copy.title,
        body: copy.body,
        emailDetail: copy.emailDetail,
        recommendationId: input.recommendationId,
        actionId: input.actionId,
      });
    } catch (e) {
      errors.push(
        e instanceof Error ? e.message : `Failed to notify ${t.email || t.userId}`
      );
    }
  }

  if (errors.length === targets.length) {
    throw new Error(
      `Could not notify anyone that changes were requested: ${errors[0]}`
    );
  }
}

function env() {
  return {
    endpoint: (process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "").replace(
      /\/$/,
      ""
    ),
    projectId: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "",
    databaseId: process.env.NEXT_PUBLIC_APPWRITE_DATABASE_ID || "",
    collectionId: process.env.NEXT_PUBLIC_APPWRITE_COLLECTION_ID || "",
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

async function getDocument(cfg, id, apiKey) {
  const res = await fetch(
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.collectionId}/documents/${id}`,
    {
      headers: {
        "X-Appwrite-Project": cfg.projectId,
        "X-Appwrite-Key": apiKey,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function listDocumentsByYear(cfg, year, apiKey) {
  const queries = [
    JSON.stringify({ method: "equal", attribute: "rec-year", values: [year] }),
    JSON.stringify({ method: "limit", values: [500] }),
  ];
  const qs = queries
    .map((q) => `queries[]=${encodeURIComponent(q)}`)
    .join("&");
  const res = await fetch(
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.collectionId}/documents?${qs}`,
    {
      headers: {
        "X-Appwrite-Project": cfg.projectId,
        "X-Appwrite-Key": apiKey,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return [];
  const body = await res.json();
  return body.documents || [];
}

function clip(text, max = 110) {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

/** Human reference: R 6.1.3 · Clean Cooking — for notification copy. */
async function resolveRecommendationRef(
  cfg,
  doc,
  recommendationId,
  actionIndex
) {
  const year = Number(doc["rec-year"]) || new Date().getFullYear();
  const category = resolveCategory(
    doc.category || doc.comments
  );
  const title = clip(String(doc.recommendations || "Untitled recommendation"));
  const actionText = clip(
    String(doc.actionItems?.[actionIndex] || ""),
    90
  );

  const yearDocs = await listDocumentsByYear(cfg, year, cfg.apiKey);
  const stubs = yearDocs.map((d) => ({
    $id: String(d.$id),
    $createdAt: String(d.$createdAt || ""),
    category: resolveCategory(
      d.category || d.comments
    ),
  }));

  const numbering = buildRecommendationNumbering(stubs);
  const info = numbering.get(recommendationId);
  const code = info?.code || getFallbackCode(category, doc);
  const categoryLabel = CATEGORY_LABELS[category];
  const actionNo = actionIndex + 1;

  return {
    code,
    displayCode: `R ${code}`,
    categoryLabel,
    title,
    actionText,
    actionNo,
    year,
    /** Compact line for notification bodies */
    headline: `${`R ${code}`} · ${categoryLabel}`,
    detail: actionText
      ? `Action ${actionNo}: “${actionText}”`
      : `Action ${actionNo}`,
  };
}

function getFallbackCode(category, doc) {
  const section =
    (typeof doc.sectionCode === "string" && doc.sectionCode) ||
    getCategoryCode(category);
  return `${section}`;
}

export async function POST(request) {
  const cfg = env();
  if (!cfg.endpoint || !cfg.projectId || !cfg.databaseId || !cfg.collectionId) {
    return NextResponse.json({ message: "Appwrite not configured" }, { status: 500 });
  }
  if (!cfg.apiKey) {
    return NextResponse.json(
      { message: "APPWRITE_API_KEY missing on server" },
      { status: 500 }
    );
  }

  const jwt =
    request.headers.get("x-appwrite-jwt") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!jwt) {
    return NextResponse.json({ message: "Not authenticated" }, { status: 401 });
  }

  const account = await getAccount(cfg.endpoint, cfg.projectId, jwt);
  if (!account) {
    return NextResponse.json({ message: "Session expired" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    recommendationId,
    actionId,
    actionIndex: rawActionIndex,
    action: reviewAction,
    l1ReviewerId,
    score,
    remark,
    editedActionText,
    editedEvidence,
  } = body;

  if (!recommendationId || !actionId || !reviewAction) {
    return NextResponse.json({ message: "Missing fields" }, { status: 400 });
  }

  const doc = await getDocument(cfg, recommendationId, cfg.apiKey);
  if (!doc) {
    return NextResponse.json({ message: "Recommendation not found" }, { status: 404 });
  }

  const items = doc.actionItems || [];
  const scores = doc.actionScores || [];
  const partners = doc.actionPartners || [];
  const evidence = doc.actionEvidence || [];
  const reviews = [...(doc.actionReviews || [])];

  while (reviews.length < items.length) {
    const i = reviews.length;
    reviews.push(
      JSON.stringify({
        id: `action-${recommendationId}-${i}`,
        status: "draft",
        feedback: [],
      })
    );
  }

  let index = reviews.findIndex((raw) => {
    try {
      return JSON.parse(raw).id === actionId;
    } catch {
      return false;
    }
  });
  const actionIndexBuf =
    typeof rawActionIndex === "number" && Number.isInteger(rawActionIndex)
      ? rawActionIndex
      : Number.NaN;
  if (index < 0 && actionIndexBuf >= 0 && actionIndexBuf < items.length) {
    index = actionIndexBuf;
  }
  // Fallback: actionId may be missing on old rows — allow numeric index
  if (index < 0 && /^\d+$/.test(actionId)) {
    const asIndex = Number(actionId);
    if (asIndex >= 0 && asIndex < items.length) index = asIndex;
  }
  if (index < 0) {
    const m = /^action-(.+)-(\d+)$/.exec(actionId);
    if (m && m[1] === recommendationId) {
      const asIndex = Number(m[2]);
      if (asIndex >= 0 && asIndex < items.length) index = asIndex;
    }
  }
  if (index < 0 && items.length === 1) {
    index = 0;
  }

  if (index < 0) {
    return NextResponse.json({ message: "Action not found" }, { status: 404 });
  }

  const meta = JSON.parse(reviews[index] || "{}");
  meta.id = meta.id || actionId || `action-${recommendationId}-${index}`;
  meta.feedback = Array.isArray(meta.feedback) ? meta.feedback : [];
  const notifyActionId = String(meta.id);
  const now = new Date().toISOString();
  const actorEmail = account.email;
  const actorName = resolveStaffDisplayName(actorEmail, account.name || actorEmail);
  const actorId = account.$id;
  const finalPublisher = getFinalPublisherUser();
  const finalPublisherName = getFinalPublisherDisplayName();
  const ref = await resolveRecommendationRef(
    cfg,
    doc,
    recommendationId,
    index
  );

  /** Clear, structured copy for inbox + email. */
  const notifyCopy = (extra = {}) =>
    buildReviewNotifyCopy(ref, {
      actorName,
      publisherName: finalPublisherName,
      ...extra,
    });

  const pushFeedback = (fromRole, message) => {
    meta.feedback.push({
      fromRole,
      fromName: actorName,
      message,
      at: now,
    });
  };

  /** Run only after the document PATCH succeeds. */
  const afterSave = [];

  try {
    if (reviewAction === "submit_l1") {
      const assignable = getAssignableL1Reviewers(actorEmail);
      const designated = getDesignatedL1Reviewer(actorEmail);
      let reviewer = designated;
      const wasChangesRequested = meta.status === "changes_requested";

      // Resubmit stays on the same L1 already in the communication line.
      if (wasChangesRequested && meta.l1ReviewerId) {
        reviewer =
          assignable.find((u) => u.userId === meta.l1ReviewerId) ||
          getRoleUserById(String(meta.l1ReviewerId)) ||
          {
            userId: String(meta.l1ReviewerId),
            name: String(meta.l1ReviewerName || "Level 1 reviewer"),
            email: String(meta.l1ReviewerEmail || ""),
            role: "l1_reviewer",
          };
      } else if (canChooseL1Approver(actorEmail)) {
        reviewer =
          assignable.find((u) => u.userId && u.userId === l1ReviewerId) ||
          undefined;
        if (!reviewer?.userId) {
          return NextResponse.json(
            {
              message:
                "Choose a Level 1 reviewer (you cannot assign yourself).",
            },
            { status: 400 }
          );
        }
      } else if (!designated?.email) {
        return NextResponse.json(
          {
            message:
              "No Level 1 reviewer is assigned to your account. Please contact an administrator.",
          },
          { status: 400 }
        );
      } else if (
        l1ReviewerId &&
        designated.userId &&
        l1ReviewerId !== designated.userId
      ) {
        return NextResponse.json(
          {
            message: `Your Level 1 reviewer is ${designated.name}. You cannot assign a different reviewer.`,
          },
          { status: 400 }
        );
      }

      let resolvedL1Id = reviewer?.userId || "";
      if (!resolvedL1Id && reviewer?.email) {
        resolvedL1Id =
          (await findUserIdByEmail(cfg.apiKey, reviewer.email)) || "";
      }
      if (!reviewer || !resolvedL1Id) {
        return NextResponse.json(
          {
            message:
              "Could not resolve Level 1 reviewer. Ensure their Appwrite user id is set in staff config.",
          },
          { status: 400 }
        );
      }
      reviewer = { ...reviewer, userId: resolvedL1Id };
      const contributorScore = normalizeScoreKey(scores[index]);
      if (!contributorScore) {
        return NextResponse.json(
          { message: "Action needs a valid contributor score first" },
          { status: 400 }
        );
      }
      // Persist REC enum key so later review steps stay valid
      scores[index] = contributorScore;

      const priorFeedback =
        Array.isArray(meta.feedback) && meta.feedback.length > 0
          ? meta.feedback[meta.feedback.length - 1]
          : null;

      meta.status = "awaiting_l1";
      meta.submitterId = actorId;
      meta.submitterName = actorName;
      meta.submitterEmail = actorEmail;
      meta.contributorScore = contributorScore;
      meta.l1ReviewerId = reviewer.userId;
      meta.l1ReviewerName = reviewer.name;
      meta.l1ReviewerEmail = reviewer.email;

      if (reviewer.userId || reviewer.email) {
        const l1UserId =
          reviewer.userId ||
          (await findUserIdByEmail(cfg.apiKey, reviewer.email)) ||
          "";
        if (!l1UserId) {
          console.error(
            "[reviews] submit_l1: could not resolve L1 userId for",
            reviewer.email
          );
        } else {
          meta.l1ReviewerId = l1UserId;
          if (wasChangesRequested) {
            const copy = notifyCopy({
              remark: priorFeedback?.message
                ? String(priorFeedback.message).slice(0, 280)
                : undefined,
            }).feedbackResponded;
            afterSave.push(() =>
              safeNotify(() =>
                notifyUser(cfg.apiKey, {
                  userId: l1UserId,
                  email: reviewer.email,
                  actorName,
                  type: "feedback_responded",
                  title: copy.title,
                  body: copy.body,
                  emailDetail: copy.emailDetail,
                  recommendationId,
                  actionId: notifyActionId,
                })
              )
            );
          } else {
            const copy = notifyCopy().l1ReviewRequested;
            afterSave.push(() =>
              safeNotify(() =>
                notifyUser(cfg.apiKey, {
                  userId: l1UserId,
                  email: reviewer.email,
                  actorName,
                  type: "l1_review_requested",
                  title: copy.title,
                  body: copy.body,
                  emailDetail: copy.emailDetail,
                  recommendationId,
                  actionId: notifyActionId,
                })
              )
            );
          }
        }
      }

      // Clear submitter's "changes requested" item for this action after resubmit
        afterSave.push(() =>
          safeNotify(() =>
            markActionNotificationsRead(cfg.apiKey, {
              userId: actorId,
              email: actorEmail,
              recommendationId,
              actionId: notifyActionId,
              types: ["changes_requested"],
            })
          )
        );
    } else if (
      reviewAction === "l1_approve" ||
      reviewAction === "l1_request_changes"
    ) {
      if (!isL1Reviewer(actorEmail)) {
        return NextResponse.json({ message: "L1 reviewers only" }, { status: 403 });
      }
      if (meta.l1ReviewerId && meta.l1ReviewerId !== actorId) {
        return NextResponse.json(
          { message: "This action is assigned to another L1 reviewer" },
          { status: 403 }
        );
      }
      // Enforce designated routing even if older rows lack l1ReviewerId
      if (meta.submitterEmail) {
        const required = getDesignatedL1Reviewer(
          meta.submitterEmail
        );
        if (
          required?.userId &&
          required.userId !== actorId &&
          normalizeEmail(required.email) !== normalizeEmail(actorEmail)
        ) {
          return NextResponse.json(
            {
              message: `Only ${required.name} can Level-1 review actions from this submitter`,
            },
            { status: 403 }
          );
        }
      }
      if (meta.submitterId && meta.submitterId === actorId) {
        return NextResponse.json(
          { message: "You cannot review an action you submitted" },
          { status: 403 }
        );
      }
      if (reviewAction === "l1_approve") {
        const l1Score = normalizeScoreKey(score);
        if (!l1Score) {
          return NextResponse.json({ message: "Score required" }, { status: 400 });
        }

        const previousText = String(items[index] || "");
        const nextText =
          typeof editedActionText === "string" ? editedActionText.trim() : "";
        const hasTextEdit = Boolean(nextText) && nextText !== previousText;
        let hasEvidenceEdit = false;
        if (Array.isArray(editedEvidence)) {
          const nextEvidence = serializeActionEvidence(editedEvidence);
          const prevEvidence = evidence[index] || "";
          if (nextEvidence !== prevEvidence) {
            evidence[index] = nextEvidence;
            hasEvidenceEdit = true;
          }
        }
        if (hasTextEdit) {
          items[index] = nextText;
        }
        const didEditContent = hasTextEdit || hasEvidenceEdit;

        /** Human summary of what the L1 changed — used in email + inbox. */
        const editedParts = [];
        if (hasTextEdit) editedParts.push("the action description");
        if (hasEvidenceEdit) editedParts.push("the evidence");
        const editedWhat =
          editedParts.length === 0
            ? "the action"
            : editedParts.join(" and ");

        meta.status = "awaiting_superadmin";
        meta.l1Score = l1Score;
        meta.l1Remark = (remark || "").trim();
        meta.l1ReviewedAt = now;
        if (didEditContent) {
          meta.l1EditedContent = true;
          meta.l1EditSummary = editedWhat;
          const note = meta.l1Remark
            ? ` Note: ${meta.l1Remark}`
            : "";
          pushFeedback(
            "l1_reviewer",
            `${actorName} made minor edits to ${editedWhat} and sent this action to ${finalPublisherName} for publication (without bouncing it back).${note}`
          );
        } else if (meta.l1Remark) {
          pushFeedback("l1_reviewer", meta.l1Remark);
        }

        afterSave.push(() =>
          safeNotify(() =>
            markActionNotificationsRead(cfg.apiKey, {
              userId: actorId,
              email: actorEmail,
              recommendationId,
              actionId: notifyActionId,
              types: [
                "l1_review_requested",
                "feedback_responded",
                "final_returned_to_l1",
              ],
            })
          )
        );

        if (finalPublisher?.userId || finalPublisher?.email) {
          const pubCopy = didEditContent
            ? notifyCopy({
                editedWhat,
                remark: meta.l1Remark || undefined,
              }).superadminReviewAfterEdit
            : notifyCopy({
                remark: meta.l1Remark || undefined,
              }).superadminReview;
          afterSave.push(() =>
            safeNotify(() =>
              notifyUser(cfg.apiKey, {
                userId: finalPublisher.userId,
                email: finalPublisher.email,
                actorName,
                type: "superadmin_review_requested",
                title: pubCopy.title,
                body: pubCopy.body,
                emailDetail: pubCopy.emailDetail,
                recommendationId,
                actionId: notifyActionId,
              })
            )
          );
        }

        // Status / edit FYI — only the person who submitted this action
        // (e.g. Silver for 6.1). Do NOT fan out to other section owners
        // (Clare is 6.5/6.6 only and must not get Clean Cooking mail).
        afterSave.push(async () => {
          let submitterId =
            typeof meta.submitterId === "string"
              ? meta.submitterId.trim()
              : "";
          let submitterEmail =
            typeof meta.submitterEmail === "string"
              ? meta.submitterEmail.trim()
              : undefined;

          if (!submitterId && submitterEmail) {
            submitterId =
              (await findUserIdByEmail(cfg.apiKey, submitterEmail)) || "";
          }

          if (!submitterId) return;

          if (didEditContent) {
            const copy = notifyCopy({
              editedWhat,
              remark: meta.l1Remark || undefined,
            }).l1EditedForwarded;
            await safeNotify(() =>
              notifyUser(cfg.apiKey, {
                userId: submitterId,
                email: submitterEmail,
                actorName,
                type: "l1_edited_and_forwarded",
                title: copy.title,
                body: copy.body,
                emailDetail: copy.emailDetail,
                recommendationId,
                actionId: notifyActionId,
              })
            );
          } else {
            const copy = notifyCopy({
              remark: meta.l1Remark || undefined,
            }).actionReviewed;
            await safeNotify(() =>
              notifyUser(cfg.apiKey, {
                userId: submitterId,
                email: submitterEmail,
                actorName,
                type: "action_reviewed",
                title: copy.title,
                body: copy.body,
                emailDetail: copy.emailDetail,
                recommendationId,
                actionId: notifyActionId,
              })
            );
          }
        });
      } else {
        const changeRemark = (remark || "").trim();
        if (!changeRemark) {
          return NextResponse.json(
            { message: "Please add a remark explaining what needs to change" },
            { status: 400 }
          );
        }
        const targets = await resolveChangeRecipients(
          cfg.apiKey,
          meta,
          doc,
          actorId
        );
        if (targets.length === 0) {
          return NextResponse.json(
            {
              message:
                "No submitter or section owner found to notify. Changes were not recorded.",
            },
            { status: 400 }
          );
        }
        meta.status = "changes_requested";
        meta.l1Remark = changeRemark;
        meta.l1ReviewedAt = now;
        pushFeedback("l1_reviewer", changeRemark);

        afterSave.push(() =>
          safeNotify(() =>
            markActionNotificationsRead(cfg.apiKey, {
              userId: actorId,
              email: actorEmail,
              recommendationId,
              actionId: notifyActionId,
              types: [
                "l1_review_requested",
                "feedback_responded",
                "final_returned_to_l1",
              ],
            })
          )
        );
        afterSave.push(() =>
          safeNotify(() =>
            notifyChangesRequested(cfg.apiKey, targets, {
              actorName,
              actorRole: "l1",
              publisherName: finalPublisherName,
              remark: changeRemark,
              recommendationId,
              actionId: notifyActionId,
              displayCode: ref.displayCode,
              detail: ref.detail,
              headline: ref.headline,
              actionNo: ref.actionNo,
              actionText: ref.actionText,
            })
          )
        );
      }
    } else if (
      reviewAction === "superadmin_publish" ||
      reviewAction === "superadmin_request_changes"
    ) {
      if (!isFinalPublisher(actorEmail)) {
        return NextResponse.json(
          { message: "Only the final publisher can complete this step." },
          { status: 403 }
        );
      }
      if (reviewAction === "superadmin_publish") {
        const finalScore = normalizeScoreKey(score);
        if (!finalScore) {
          return NextResponse.json({ message: "Final score required" }, { status: 400 });
        }
        meta.status = "published";
        meta.superadminScore = finalScore;
        meta.superadminRemark = (remark || "").trim();
        meta.superadminReviewedAt = now;
        meta.publishedAt = now;
        // Public-facing score on the action
        scores[index] = finalScore;
        if (meta.superadminRemark) {
          pushFeedback("superadmin", meta.superadminRemark);
        }

        // Wipe the full review-line thread for THIS action (all users).
        // Email-only "published" notice — no inbox card left behind.
        afterSave.push(async () => {
          await safeNotify(() =>
            deleteActionNotificationThread(cfg.apiKey, {
              recommendationId,
              actionId: notifyActionId,
            })
          );
          if (meta.submitterId) {
            const copy = notifyCopy({
              remark: meta.superadminRemark || undefined,
            }).published;
            await safeNotify(() =>
              notifyUser(cfg.apiKey, {
                userId: meta.submitterId,
                email: meta.submitterEmail,
                actorName,
                type: "action_published",
                title: copy.title,
                body: copy.body,
                emailDetail: copy.emailDetail,
                recommendationId,
                actionId: notifyActionId,
                skipInApp: true,
              })
            );
          }
        });
      } else {
        const changeRemark = (remark || "").trim();
        if (!changeRemark) {
          return NextResponse.json(
            { message: "Please add a remark explaining what needs to change" },
            { status: 400 }
          );
        }

        // Final approver returns to the L1 who sent it — not straight to assignee.
        const l1Id =
          typeof meta.l1ReviewerId === "string"
            ? meta.l1ReviewerId.trim()
            : "";
        const l1Email =
          typeof meta.l1ReviewerEmail === "string"
            ? meta.l1ReviewerEmail.trim()
            : undefined;
        const l1Name =
          typeof meta.l1ReviewerName === "string" && meta.l1ReviewerName.trim()
            ? meta.l1ReviewerName.trim()
            : "Level 1 reviewer";

        if (!l1Id && !l1Email) {
          return NextResponse.json(
            {
              message:
                "No Level 1 reviewer is recorded on this action. Cannot return it along the review line.",
            },
            { status: 400 }
          );
        }

        meta.status = "awaiting_l1";
        meta.superadminRemark = changeRemark;
        meta.superadminReviewedAt = now;
        pushFeedback("superadmin", changeRemark);

        const copy = notifyCopy({
          remark: changeRemark,
          l1Name,
        });

        afterSave.push(() =>
          safeNotify(() =>
            markActionNotificationsRead(cfg.apiKey, {
              userId: actorId,
              email: actorEmail,
              recommendationId,
              actionId: notifyActionId,
              types: ["superadmin_review_requested"],
            })
          )
        );

        // Actionable notice for L1
        afterSave.push(() =>
          safeNotify(() =>
            notifyUser(cfg.apiKey, {
              userId: l1Id,
              email: l1Email,
              actorName,
              type: "final_returned_to_l1",
              title: copy.finalReturnedToL1.title,
              body: copy.finalReturnedToL1.body,
              emailDetail: copy.finalReturnedToL1.emailDetail,
              recommendationId,
              actionId: notifyActionId,
            })
          )
        );

        // FYI for assignee — they stay in the loop
        afterSave.push(async () => {
          let submitterId =
            typeof meta.submitterId === "string"
              ? meta.submitterId.trim()
              : "";
          let submitterEmail =
            typeof meta.submitterEmail === "string"
              ? meta.submitterEmail.trim()
              : undefined;
          if (!submitterId && submitterEmail) {
            submitterId =
              (await findUserIdByEmail(cfg.apiKey, submitterEmail)) || "";
          }
          if (!submitterId) return;
          await safeNotify(() =>
            notifyUser(cfg.apiKey, {
              userId: submitterId,
              email: submitterEmail,
              actorName,
              type: "publisher_returned_fyi",
              title: copy.publisherReturnedFyi.title,
              body: copy.publisherReturnedFyi.body,
              emailDetail: copy.publisherReturnedFyi.emailDetail,
              recommendationId,
              actionId: notifyActionId,
            })
          );
        });
      }
    } else {
      return NextResponse.json({ message: "Unknown action" }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : "Review update failed";
    return NextResponse.json({ message }, { status: 500 });
  }

  if (!ACTION_REVIEW_STATUSES.includes(meta.status)) {
    return NextResponse.json({ message: "Invalid status" }, { status: 500 });
  }

  reviews[index] = JSON.stringify(meta);

  const patchRes = await fetch(
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.collectionId}/documents/${recommendationId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": cfg.projectId,
        "X-Appwrite-Key": cfg.apiKey,
      },
      body: JSON.stringify({
        data: {
          actionReviews: reviews,
          actionScores: scores,
          actionItems: items,
          actionPartners: partners,
          actionEvidence: evidence,
        },
      }),
    }
  );

  if (!patchRes.ok) {
    const err = await patchRes.json().catch(() => ({}));
    return NextResponse.json(
      { message: err.message || "Failed to save review state" },
      { status: 500 }
    );
  }

  for (const fx of afterSave) {
    await fx();
  }

  return NextResponse.json({ ok: true, review: meta });
}
