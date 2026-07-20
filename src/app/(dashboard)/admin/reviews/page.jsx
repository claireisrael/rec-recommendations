"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { getAccount } from "@/lib/appwrite/client";
import {
  listNotificationsForUser,
  markNotificationsRead,
  dismissActionNotificationThread,
} from "@/lib/appwrite/notifications";
import { useRecommendations } from "@/lib/hooks/useRecommendations";
import { buildRecommendationNumbering } from "@/lib/numbering";
import { AdminPageContent } from "@/components/admin/AdminPageContent";
import { NumberCode } from "@/components/ui/number-code";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle2,
  ClipboardCheck,
  MessageSquareWarning,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getFinalPublisherDisplayName,
  isFinalPublisher,
} from "@/lib/roles";
import { parseNotificationActor } from "@/lib/notification-actor";
import { toast } from "sonner";

/** @typedef {'action' | 'progress' | 'success' | 'alert' | 'neutral'} Tone */

/** @type {Record<string, { label: string; icon: typeof Bell; actionable: boolean; tone: Tone }>} */
const TYPE_META_BASE = {
  l1_review_requested: {
    label: "Needs your L1 review",
    icon: ClipboardCheck,
    actionable: true,
    tone: "action",
  },
  feedback_responded: {
    label: "Feedback addressed — re-review",
    icon: ClipboardCheck,
    actionable: true,
    tone: "action",
  },
  final_returned_to_l1: {
    label: "Final approver returned to you",
    icon: ShieldCheck,
    actionable: true,
    tone: "alert",
  },
  publisher_returned_fyi: {
    label: "Final approver returned to L1",
    icon: ShieldCheck,
    actionable: false,
    tone: "progress",
  },
  superadmin_review_requested: {
    label: "Final review & publication",
    icon: ShieldCheck,
    actionable: true,
    tone: "action",
  },
  action_reviewed: {
    label: "Pending final publication",
    icon: ShieldCheck,
    actionable: false,
    tone: "progress",
  },
  l1_edited_and_forwarded: {
    label: "Your L1 edited & forwarded",
    icon: ShieldCheck,
    actionable: true,
    tone: "progress",
  },
  action_published: {
    label: "Published",
    icon: Sparkles,
    actionable: false,
    tone: "success",
  },
  changes_requested: {
    label: "Sent back by L1 — update needed",
    icon: MessageSquareWarning,
    actionable: true,
    tone: "alert",
  },
  responsibility_assigned: {
    label: "Assignment",
    icon: Bell,
    actionable: false,
    tone: "neutral",
  },
};

const TYPE_META = (() => {
  const publisher = getFinalPublisherDisplayName();
  return {
    ...TYPE_META_BASE,
    superadmin_review_requested: {
      ...TYPE_META_BASE.superadmin_review_requested,
      label: `Final review (${publisher})`,
    },
    action_reviewed: {
      ...TYPE_META_BASE.action_reviewed,
      label: `With ${publisher} for publication`,
    },
  };
})();

/** Soft washed card styles — red reserved for unread/new notification cues. */
const TONE_STYLES = {
  action: {
    card: "border-[#dce6e9] bg-white shadow-[0_2px_12px_rgba(46, 158, 204,0.05)]",
    bar: "bg-primary/80",
    icon: "bg-[#e8f3f5] text-primary",
    badge: "bg-[#e8f3f5] text-primary",
    callout: "border-[#e4eef0] bg-[#f7fafb]",
    calloutLabel: "text-primary/80",
  },
  progress: {
    card: "border-[#dce6e9] bg-white shadow-[0_2px_12px_rgba(46, 158, 204,0.05)]",
    bar: "bg-primary/60",
    icon: "bg-[#e8f3f5] text-primary",
    badge: "bg-[#e8f3f5] text-primary",
    callout: "border-[#e4eef0] bg-[#f7fafb]",
    calloutLabel: "text-primary/80",
  },
  success: {
    card: "border-[#dce6e9] bg-white shadow-[0_2px_12px_rgba(46, 158, 204,0.05)]",
    bar: "bg-emerald-500/70",
    icon: "bg-emerald-50 text-emerald-700",
    badge: "bg-emerald-50 text-emerald-700",
    callout: "border-emerald-100 bg-emerald-50/60",
    calloutLabel: "text-emerald-800",
  },
  alert: {
    card: "border-[#dce6e9] bg-white shadow-[0_2px_12px_rgba(46, 158, 204,0.05)]",
    bar: "bg-rose-500/80",
    icon: "bg-rose-50 text-rose-600",
    badge: "bg-rose-50 text-rose-700",
    callout: "border-rose-100 bg-rose-50/50",
    calloutLabel: "text-rose-800",
  },
  neutral: {
    card: "border-[#dce6e9] bg-white shadow-[0_2px_12px_rgba(46, 158, 204,0.05)]",
    bar: "bg-primary/50",
    icon: "bg-[#e8f3f5] text-primary",
    badge: "bg-[#eef3f5] text-primary",
    callout: "border-[#e4eef0] bg-[#f7fafb]",
    calloutLabel: "text-primary/80",
  },
};

/**
 * @param {{
 *   type: import("@/lib/appwrite/notification-types").NotificationType,
 *   body: string,
 *   displayCode?: string,
 *   categoryLabel?: string,
 *   year?: number,
 *   actionText?: string,
 *   viewerIsFinalPublisher?: boolean,
 * }} input
 * @returns {{ headline: string, detail: string, spotlight?: string }}
 */
function buildClearMessage(input) {
  const parsed = parseNotificationActor(input.body);
  const who = parsed.actorName;
  const ref = input.displayCode
    ? `${input.displayCode}${input.categoryLabel ? ` · ${input.categoryLabel}` : ""}${
        input.year ? ` (${input.year})` : ""
      }`
    : "a REC recommendation";
  const publisher = getFinalPublisherDisplayName();
  const publisherLabel = input.viewerIsFinalPublisher ? "you" : publisher;

  switch (input.type) {
    case "l1_review_requested":
      return {
        headline: who
          ? `${who} asked you to review an action`
          : "You have an action to review",
        detail: ref,
        spotlight: input.actionText,
      };
    case "feedback_responded":
      return {
        headline: who
          ? `${who} responded to your feedback`
          : "Feedback was addressed",
        detail: ref,
        spotlight: input.actionText,
      };
    case "final_returned_to_l1":
      return {
        headline: who
          ? `${who} returned this action to you`
          : "Returned to you",
        detail: ref,
        spotlight: input.actionText,
      };
    case "publisher_returned_fyi":
      return {
        headline: who
          ? `${who} returned your action to Level 1`
          : "Returned to Level 1",
        detail: ref,
        spotlight: input.actionText,
      };
    case "superadmin_review_requested":
      return {
        headline: who
          ? `${who} sent an action to ${publisherLabel}`
          : input.viewerIsFinalPublisher
            ? "An action is ready for you"
            : `Ready for ${publisher}`,
        detail: ref,
        spotlight: input.actionText,
      };
    case "action_reviewed":
      return {
        headline: input.viewerIsFinalPublisher
          ? "Ready for your publication review"
          : `With ${publisher} for publication`,
        detail: ref,
        spotlight: input.actionText || ref,
      };
    case "l1_edited_and_forwarded":
      return {
        headline: who
          ? `${who} edited your action`
          : "Your Level 1 approver edited your action",
        detail: `Sent to ${publisherLabel} · ${ref}`,
        spotlight: input.actionText || ref,
      };
    case "action_published":
      return {
        headline: who
          ? `${who} published your action`
          : "Your action was published",
        detail: ref,
        spotlight: ref,
      };
    case "changes_requested":
      return {
        headline: who
          ? `${who} sent this action back to you`
          : "This action was sent back to you",
        detail: ref,
        spotlight: input.actionText,
      };
    default:
      return {
        headline: TYPE_META[input.type]?.label || "Notification",
        detail: parsed.body
          .replace(/\b[0-9a-f]{20}\b/gi, ref)
          .replace(/under recommendation\s+this recommendation/gi, `under ${ref}`)
          .replace(/recommendation this recommendation/gi, ref),
      };
  }
}

/** Work items stay until the reviewer finishes that action (API marks them read). */
/** @type {Set<import("@/lib/appwrite/notification-types").NotificationType>} */
const ACTIONABLE_TYPES = new Set([
  "l1_review_requested",
  "feedback_responded",
  "final_returned_to_l1",
  "superadmin_review_requested",
  "changes_requested",
  "l1_edited_and_forwarded",
]);

/** Status updates (no approval) remain visible for this long, then drop. */
const STATUS_TTL_MS = 15 * 60 * 1000;

/** @param {import("@/lib/appwrite/notification-types").AppNotification} n */
function notificationAgeMs(n) {
  if (!n.$createdAt) return 0;
  const t = new Date(n.$createdAt).getTime();
  return Number.isFinite(t) ? Date.now() - t : 0;
}

/** @param {import("@/lib/appwrite/notification-types").AppNotification} n */
function isExpiredStatusUpdate(n) {
  return !ACTIONABLE_TYPES.has(n.type) && notificationAgeMs(n) >= STATUS_TTL_MS;
}

export default function ReviewsInboxPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState(
    /** @type {import("@/lib/appwrite/notifications").AppNotification[]} */ ([])
  );
  const [loading, setLoading] = useState(true);
  const [deletingKey, setDeletingKey] = useState(/** @type {string | null} */ (null));
  const { recommendations } = useRecommendations();
  const expiryPass = useRef(false);
  const viewerIsFinalPublisher = isFinalPublisher(user?.email);
  const viewerCanDismissThread = Boolean(user);

  const numbering = useMemo(
    () => buildRecommendationNumbering(recommendations),
    [recommendations]
  );

  const recById = useMemo(() => {
    return new Map(recommendations.map((r) => [r.$id, r]));
  }, [recommendations]);

  const pendingCount = useMemo(
    () =>
      items.filter((n) => !n.read && ACTIONABLE_TYPES.has(n.type)).length,
    [items]
  );

  /** Unread work that still needs action, then the remaining trail (incl. read). */
  const actionNeeded = useMemo(
    () => items.filter((n) => !n.read && ACTIONABLE_TYPES.has(n.type)),
    [items]
  );
  const recentTrail = useMemo(() => {
    const actionIds = new Set(actionNeeded.map((n) => n.$id).filter(Boolean));
    return items.filter((n) => {
      if (n.$id && actionIds.has(n.$id)) return false;
      // Published cards never stay — workflow is closed for that action.
      if (n.type === "action_published") return false;
      // Status FYIs drop after TTL whether read or unread.
      if (isExpiredStatusUpdate(n)) return false;
      return true;
    });
  }, [items, actionNeeded]);
  const queueItems = useMemo(
    () => [...actionNeeded, ...recentTrail],
    [actionNeeded, recentTrail]
  );

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    expiryPass.current = false;
    try {
      const jwt = await getAccount().createJWT();
      const list = await listNotificationsForUser(jwt.jwt);
      // Keep the full trail (read + unread) so L1 / assignees can see the loop.
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  // Persist-read status notifications once they pass the 15-minute window.
  useEffect(() => {
    if (loading || !user || expiryPass.current || items.length === 0) return;
    const expiredIds = items
      .filter((n) => !n.read && n.$id && isExpiredStatusUpdate(n))
      .map((n) => n.$id)
      .filter(Boolean);
    if (expiredIds.length === 0) {
      expiryPass.current = true;
      return;
    }

    expiryPass.current = true;
    let cancelled = false;

    (async () => {
      try {
        const jwt = await getAccount().createJWT();
        await markNotificationsRead(jwt.jwt, expiredIds);
        if (cancelled) return;
        setItems((prev) =>
          prev.map((n) =>
            expiredIds.includes(n.$id || "") ? { ...n, read: true } : n
          )
        );
      } catch {
        expiryPass.current = false;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, items, user]);

  // While the inbox is open, drop status items as they hit 15 minutes.
  useEffect(() => {
    if (loading || items.length === 0) return;
    const timer = window.setInterval(() => {
      const expiredIds = items
        .filter((n) => !n.read && n.$id && isExpiredStatusUpdate(n))
        .map((n) => n.$id)
        .filter(Boolean);
      if (expiredIds.length === 0) return;

      (async () => {
        try {
          if (!user) return;
          const jwt = await getAccount().createJWT();
          await markNotificationsRead(jwt.jwt, expiredIds);
          setItems((prev) =>
            prev.map((n) =>
              expiredIds.includes(n.$id || "") ? { ...n, read: true } : n
            )
          );
        } catch {
          /* keep showing until next pass */
        }
      })();
    }, 30_000);

    return () => window.clearInterval(timer);
  }, [loading, items, user]);

  /** @param {string} href */
  const openNotification = (href) => {
    router.push(href);
  };

  /**
   * @param {{ recommendationId: string; actionId: string; notificationId: string }} input
   */
  const dismissActionThread = async (input) => {
    if (!user || !viewerCanDismissThread) return;
    const key = input.notificationId || `${input.recommendationId}:${input.actionId}`;
    if (deletingKey === key) return;
    setDeletingKey(key);
    try {
      const jwt = await getAccount().createJWT();
      const deleted = await dismissActionNotificationThread(jwt.jwt, input);
      if (deleted > 0) {
        setItems((prev) => {
          if (viewerIsFinalPublisher) {
            // Publisher wipe: drop every card for that action.
            return prev.filter(
              (n) =>
                !(
                  String(n.recommendationId || "") === input.recommendationId &&
                  String(n.actionId || "") === input.actionId
                )
            );
          }
          // L1: remove only the card they clicked.
          return prev.filter((n) => String(n.$id || "") !== input.notificationId);
        });
        toast.success("Notification cleared");
      } else {
        toast.error("Could not clear this notification");
      }
    } catch {
      toast.error("Could not clear this notification");
    } finally {
      setDeletingKey(null);
    }
  };

  return (
    <AdminPageContent>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-2xl border border-[#dce6e9] bg-white shadow-[0_2px_12px_rgba(46, 158, 204,0.05)]">
          <div className="h-1 w-full bg-primary/70" />
          <div className="flex flex-col gap-5 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
            <div className="flex items-start gap-3">
              <Link href="/admin">
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-muted hover:bg-[#eef5f6] hover:text-primary"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-rose-600">
                  <Bell className="h-3.5 w-3.5" />
                  Inbox
                </p>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
                  Review inbox
                </h1>
              </div>
            </div>

            {!loading && (
              <div className="min-w-[8.5rem] rounded-2xl border border-[#e5e9ec] bg-white px-4 py-3.5 text-center shadow-[0_1px_4px_rgba(0,0,0,0.04)]">
                <p className="text-4xl font-semibold tabular-nums leading-none text-rose-600">
                  {queueItems.length}
                </p>
                <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6b7280]">
                  {queueItems.length > 0 ? "In inbox" : "Clear"}
                </p>
                <p className="mt-0.5 text-[11px] font-medium text-[#9ca3af]">
                  {pendingCount} need action
                </p>
              </div>
            )}
          </div>
        </section>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl border-2 border-primary/15 bg-primary-soft/70"
              />
            ))}
          </div>
        ) : queueItems.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#d5e2e5] bg-white px-6 py-14 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-[#e8f3f5] text-primary">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <p className="text-xl font-semibold text-foreground">
              Nothing waiting right now
            </p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm font-medium text-muted">
              When someone needs you, it will show up here.
            </p>
          </div>
        ) : (
          <ul className="space-y-5">
            {queueItems.map((n) => {
              const meta = TYPE_META[n.type] || TYPE_META.l1_review_requested;
              const tone = TONE_STYLES[meta.tone];
              const Icon = meta.icon;
              const info = n.recommendationId
                ? numbering.get(n.recommendationId)
                : undefined;
              const rec = n.recommendationId
                ? recById.get(n.recommendationId)
                : undefined;
              const actionIndex =
                n.actionId && rec
                  ? rec.actions.findIndex((a) => a.id === n.actionId)
                  : -1;
              const action =
                actionIndex >= 0 && rec ? rec.actions[actionIndex] : undefined;
              const displayCode = info ? `R ${info.code}` : undefined;
              const copy = buildClearMessage({
                type: n.type,
                body: n.body,
                displayCode,
                categoryLabel: info?.categoryLabel,
                year: rec?.year,
                actionText: action?.text
                  ? action.text.length > 140
                    ? `${action.text.slice(0, 139)}…`
                    : action.text
                  : undefined,
                viewerIsFinalPublisher: viewerIsFinalPublisher,
              });
              const href = n.recommendationId
                ? `/admin/${n.recommendationId}${
                    n.actionId
                      ? `?review=${encodeURIComponent(n.actionId)}`
                      : ""
                  }`
                : null;
              const isProgress = n.type === "action_reviewed";
              const canClearThread =
                viewerCanDismissThread &&
                Boolean(n.$id && n.recommendationId && n.actionId);
              const threadKey = canClearThread && n.$id ? String(n.$id) : null;
              const clearing = threadKey != null && deletingKey === threadKey;

              return (
                <li
                  key={n.$id}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border transition-colors hover:bg-[#fafcfc]",
                    tone.card,
                    !n.read && "border-l-[3px] border-l-red-400"
                  )}
                >
                  <div className={cn("h-[3px] w-full", tone.bar)} />
                  {canClearThread && (
                    <button
                      type="button"
                      title="Clear notification"
                      aria-label="Clear notification"
                      disabled={clearing}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void dismissActionThread({
                          recommendationId: String(n.recommendationId),
                          actionId: String(n.actionId),
                          notificationId: String(n.$id),
                        });
                      }}
                      className="absolute right-2.5 top-3 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md text-muted/70 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                    >
                      <Trash2 className="h-3 w-3" strokeWidth={2} />
                    </button>
                  )}
                  <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-stretch sm:justify-between sm:p-5">
                    <div className="flex min-w-0 flex-1 gap-3.5">
                      <div
                        className={cn(
                          "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                          !n.read ? "bg-rose-50 text-rose-600" : tone.icon
                        )}
                      >
                        <Icon className="h-5 w-5" strokeWidth={1.75} />
                      </div>
                      <div className="min-w-0 flex-1 pr-6">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                              tone.badge
                            )}
                          >
                            {meta.label}
                          </span>
                          {info && <NumberCode code={info.code} size="sm" />}
                          {info && (
                            <span className="text-sm font-semibold text-foreground/80">
                              {info.categoryLabel}
                              {rec ? ` · ${rec.year}` : ""}
                            </span>
                          )}
                          {!n.read && (
                            <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                              New
                            </span>
                          )}
                        </div>

                        <p className="mt-2.5 text-lg font-semibold leading-snug text-foreground sm:text-xl">
                          {copy.headline}
                        </p>

                        {rec && (
                          <p className="mt-2 line-clamp-2 text-base font-semibold text-primary">
                            {rec.recommendation}
                          </p>
                        )}

                        {(copy.spotlight || action?.text) && (
                          <div
                            className={cn(
                              "mt-3 rounded-xl border px-3.5 py-2.5",
                              tone.callout
                            )}
                          >
                            <p
                              className={cn(
                                "text-[10px] font-semibold uppercase tracking-[0.12em]",
                                tone.calloutLabel
                              )}
                            >
                              {isProgress
                                ? "Status update"
                                : action
                                  ? `Action ${actionIndex + 1}`
                                  : "Details"}
                            </p>
                            <p className="mt-1 text-sm font-medium leading-snug text-foreground/90">
                              {copy.spotlight || action?.text}
                            </p>
                          </div>
                        )}

                        <p className="mt-3 text-sm font-medium leading-relaxed text-muted">
                          {copy.detail}
                        </p>

                        {n.$createdAt && (
                          <p className="mt-2 text-xs font-medium text-muted">
                            {new Date(n.$createdAt).toLocaleString(undefined, {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </p>
                        )}
                      </div>
                    </div>

                    {href && (
                      <div className="flex shrink-0 items-end sm:items-center sm:pl-2">
                        <Button
                          size="default"
                          className="w-full gap-2 rounded-xl sm:w-auto"
                          onClick={() => openNotification(href)}
                        >
                          {isProgress ? "View" : "Open"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </AdminPageContent>
  );
}
