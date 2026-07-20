"use client";

import { useEffect, useState } from "react";
import { ACTION_REVIEW_STATUS_LABELS } from "@/lib/action-review";
import {
  canChooseL1Approver,
  getAssignableL1Reviewers,
  getDesignatedL1Reviewer,
  getFinalPublisherDisplayName,
  isFinalPublisher,
  isL1Reviewer,
  normalizeEmail,
} from "@/lib/roles";
import { toScoreTierKey } from "@/lib/score";
import { ScoreTierSelect } from "@/components/ui/score-tier-select";
import { ScoreLegend } from "@/components/ui/score-legend";
import { ScoreBadge } from "@/components/ui/score-badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Dialog } from "@/components/ui/dialog";
import { ActionEvidenceField } from "@/components/admin/ActionEvidenceField";
import { getAccount } from "@/lib/appwrite/client";
import { toast } from "sonner";
import { revalidateGuestPortal } from "@/lib/revalidate-guest";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  ClipboardCheck,
  MessageSquare,
  MessageSquareWarning,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

/** @typedef {import("@/lib/action-review").ActionReviewStatus} ActionReviewStatus */

/** @type {Record<ActionReviewStatus, { badge: string; icon: typeof CheckCircle2 }>} */
const REVIEW_STATUS_STYLES = {
  draft: {
    badge: "border border-[rgba(46, 158, 204,0.12)] bg-[#f4f8f9] text-primary/70",
    icon: ClipboardCheck,
  },
  awaiting_l1: {
    badge: "border border-secondary/30 bg-[#fff8e6] text-[#8a6200]",
    icon: Send,
  },
  awaiting_superadmin: {
    badge: "border border-primary/20 bg-[#e8f4f6] text-primary",
    icon: ShieldCheck,
  },
  published: {
    badge: "border border-secondary/40 bg-secondary text-white shadow-[0_2px_8px_rgba(239, 167, 79,0.25)]",
    icon: Sparkles,
  },
  changes_requested: {
    badge: "border border-rose-200 bg-rose-50 text-rose-700",
    icon: MessageSquareWarning,
  },
};

/** @param {"l1_reviewer" | "superadmin"} role */
function formatFeedbackRole(role) {
  return role === "l1_reviewer" ? "L1 reviewer" : "Final approver";
}

/** @param {string} name */
function feedbackInitials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

/** @param {"l1_reviewer" | "superadmin"} role */
function feedbackAccent(role) {
  return role === "l1_reviewer"
    ? { avatar: "bg-[#e8f4f6] text-primary ring-primary/20" }
    : { avatar: "bg-[#fff4d6] text-[#8a6200] ring-secondary/30" };
}

/**
 * @param {Record<string, unknown>} payload
 */
async function postReview(payload) {
  const jwt = await getAccount().createJWT();
  const res = await fetch("/api/admin/reviews", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Appwrite-JWT": jwt.jwt,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}

/**
 * @param {{
 *   recommendation: import("@/lib/types/recommendation").Recommendation,
 *   action: import("@/lib/types/recommendation").ActionItem,
 *   actionIndex: number,
 *   userEmail: string | null | undefined,
 *   userId: string | null | undefined,
 *   focused?: boolean,
 *   onUpdated: () => void
 * }} props
 */
export function ActionReviewPanel({
  recommendation,
  action,
  actionIndex,
  userEmail,
  userId,
  focused = false,
  onUpdated,
}) {
  const review = action.review;
  const status =
    /** @type {ActionReviewStatus} */ (review?.status || "draft");
  const choosesL1 = canChooseL1Approver(userEmail);
  const designatedL1 = getDesignatedL1Reviewer(userEmail);
  const peerL1Options = getAssignableL1Reviewers(userEmail);
  const [l1ReviewerId, setL1ReviewerId] = useState(
    () => peerL1Options[0]?.userId || ""
  );
  /** @type {[import("@/lib/score").ScoreTierKey, import("react").Dispatch<import("react").SetStateAction<import("@/lib/score").ScoreTierKey>>]} */
  const [score, setScore] = useState(() => toScoreTierKey(action.scoreTier));
  const [remark, setRemark] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [showL1Edits, setShowL1Edits] = useState(false);
  const [editText, setEditText] = useState(action.text || "");
  /** @type {[import("@/lib/evidence").EvidenceItem[], import("react").Dispatch<import("react").SetStateAction<import("@/lib/evidence").EvidenceItem[]>>]} */
  const [editEvidence, setEditEvidence] = useState(() => [
    ...(action.evidence || []),
  ]);

  useEffect(() => {
    setScore(toScoreTierKey(action.scoreTier));
    setEditText(action.text || "");
    setEditEvidence([...(action.evidence || [])]);
    setShowL1Edits(false);
  }, [action.scoreTier, action.id, action.text, action.evidence]);

  useEffect(() => {
    const options = getAssignableL1Reviewers(userEmail);
    setL1ReviewerId((prev) =>
      options.some((u) => u.userId === prev)
        ? prev
        : options[0]?.userId || ""
    );
  }, [userEmail]);

  const isResubmit = status === "changes_requested";
  const isSubmitter =
    Boolean(userId && review?.submitterId && review.submitterId === userId) ||
    Boolean(
      userEmail &&
        review?.submitterEmail &&
        normalizeEmail(review.submitterEmail) === normalizeEmail(userEmail)
    );
  /** This user is the Level 1 named on this action’s thread. */
  const isThisActionsL1 = Boolean(
    userId && review?.l1ReviewerId && review.l1ReviewerId === userId
  );
  const isAssignedL1 =
    isL1Reviewer(userEmail) &&
    status === "awaiting_l1" &&
    (isThisActionsL1 || (!review?.l1ReviewerId && !isSubmitter));
  const canL1Review = status === "awaiting_l1" && isAssignedL1;
  const canFinalPublish =
    isFinalPublisher(userEmail) && status === "awaiting_superadmin";

  // Assignees only. L1 on this thread must never see "Resend to L1".
  const canSubmitL1 =
    status === "draft"
      ? !canL1Review && !canFinalPublish
      : status === "changes_requested" &&
        isSubmitter &&
        !isThisActionsL1 &&
        !canFinalPublish;

  /** On resubmit, stay on the same L1 already in the communication line. */
  const lockedResubmitL1Id =
    isResubmit && review?.l1ReviewerId ? String(review.l1ReviewerId) : "";
  const lockedResubmitL1Name =
    (isResubmit && review?.l1ReviewerName) ||
    peerL1Options.find((u) => u.userId === lockedResubmitL1Id)?.name ||
    designatedL1?.name ||
    "";

  const selectedPeer = peerL1Options.find((u) => u.userId === l1ReviewerId);
  const resolvedSubmitL1Id = lockedResubmitL1Id
    ? lockedResubmitL1Id
    : choosesL1
      ? l1ReviewerId
      : designatedL1?.userId || "";
  const canConfirmSubmit = Boolean(resolvedSubmitL1Id);

  const lastFeedback = review?.feedback?.[review.feedback.length - 1];
  const lastFromFinal =
    lastFeedback?.fromRole === "superadmin" ||
    lastFeedback?.fromRole === "final_publisher";
  const returnedByFinalApprover =
    canL1Review && lastFromFinal && Boolean(review?.superadminRemark);
  const resubmitHint = lastFromFinal
    ? `Returned by ${lastFeedback?.fromName || getFinalPublisherDisplayName()}`
    : lockedResubmitL1Name
      ? `Ready to resend to ${lockedResubmitL1Name}`
      : "Ready to resend for Level 1 review";

  /**
   * @param {Record<string, unknown>} payload
   */
  const run = async (payload) => {
    setBusy(true);
    try {
      await postReview({
        recommendationId: recommendation.$id,
        actionId: action.id,
        actionIndex,
        ...payload,
      });
      await revalidateGuestPortal();
      const actionName = String(payload.action || "");
      if (actionName === "l1_approve") {
        toast.success(
          l1HasPendingEdits
            ? `Edits saved — assignee notified — sent to ${getFinalPublisherDisplayName()}`
            : `Sent to ${getFinalPublisherDisplayName()} for publication`
        );
      } else if (actionName === "l1_request_changes") {
        toast.success("Sent back to the assignee with your feedback");
      } else if (actionName === "superadmin_request_changes") {
        toast.success(
          `Sent back to ${review.l1ReviewerName || "Level 1"} — assignee notified`
        );
      } else if (actionName === "submit_l1") {
        toast.success(
          isResubmit
            ? lockedResubmitL1Name
              ? `Resent to ${lockedResubmitL1Name} for review`
              : "Resent to Level 1 for review"
            : "Submitted for Level 1 review"
        );
        setSubmitOpen(false);
      } else if (actionName === "superadmin_publish") {
        toast.success("Published successfully");
      } else {
        toast.success("Review saved successfully");
      }
      setRemark("");
      onUpdated();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Review could not be saved. Try again."
      );
    } finally {
      setBusy(false);
    }
  };

  const sendToSuperadmin = () => {
    /** @type {Record<string, unknown>} */
    const payload = { action: "l1_approve", score, remark };
    if (showL1Edits) {
      const trimmed = editText.trim();
      if (!trimmed) {
        toast.error("Action text cannot be empty");
        return;
      }
      payload.editedActionText = trimmed;
      payload.editedEvidence = editEvidence;
    }
    return run(payload);
  };

  const l1HasPendingEdits =
    showL1Edits &&
    (editText.trim() !== (action.text || "").trim() ||
      JSON.stringify(editEvidence) !== JSON.stringify(action.evidence || []));

  const statusStyle = REVIEW_STATUS_STYLES[status];
  const StatusIcon = statusStyle.icon;

  return (
    <div
      id={`action-review-${action.id}`}
      className={cn(
        "relative space-y-4 overflow-hidden rounded-xl border p-4 pt-5",
        status === "published"
          ? "border-[rgba(239, 167, 79,0.35)] bg-gradient-to-br from-white via-white to-[#fffbf0] shadow-[0_4px_20px_rgba(239, 167, 79,0.1)]"
          : focused
            ? "border-secondary bg-white shadow-[0_4px_16px_rgba(239, 167, 79,0.12)] ring-1 ring-secondary/40"
            : "border-border bg-white shadow-[0_1px_3px_rgba(46, 158, 204,0.04)]"
      )}
    >
      {(status === "published" || focused) && (
        <span
          className={cn(
            "absolute inset-x-0 top-0 h-[3px]",
            status === "published"
              ? "bg-gradient-to-r from-primary via-secondary to-primary-light"
              : "bg-gradient-to-r from-secondary via-secondary/80 to-primary/40"
          )}
        />
      )}

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
            statusStyle.badge
          )}
        >
          <StatusIcon className="h-3.5 w-3.5 shrink-0" />
          {ACTION_REVIEW_STATUS_LABELS[status]}
        </span>
        <span className="font-medium text-foreground/80">
          Action {actionIndex + 1} of {recommendation.actions.length}
        </span>
        {review.l1ReviewerName && (
          <span className="font-medium text-foreground/80">
            · L1: {review.l1ReviewerName}
          </span>
        )}
        {status === "published" && review.publishedAt && (
          <span className="font-medium text-foreground/65">
            ·{" "}
            {new Date(review.publishedAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        )}
        {focused && (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
            Assigned to you
          </span>
        )}
      </div>

      {(canL1Review || canFinalPublish) && (
        <div className="rounded-lg border border-primary/15 bg-white p-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
            Contributor proposed score
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <ScoreBadge scoreTier={action.scoreTier} showValue size="md" />
          </div>
        </div>
      )}

      {(review.feedback?.length ?? 0) > 0 && (
        <div className="overflow-hidden rounded-xl border border-[rgba(46, 158, 204,0.1)] bg-gradient-to-br from-[#f8fafb] via-white to-[#eef5f7]">
          <div className="flex items-center gap-2 border-b border-[rgba(46, 158, 204,0.08)] bg-white/80 px-3.5 py-2.5">
            <MessageSquare className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">
              Feedback thread
            </p>
            <span className="ml-auto rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
              {review.feedback?.length}{" "}
              {review.feedback?.length === 1 ? "message" : "messages"}
            </span>
          </div>
          <div className="space-y-0 divide-y divide-[rgba(46, 158, 204,0.06)] p-2">
            {review.feedback?.map((f, i) => {
              const accent = feedbackAccent(f.fromRole);
              return (
                <div
                  key={`${f.at}-${i}`}
                  className="relative flex gap-3 px-2 py-3"
                >
                  <span
                    className={cn(
                      "absolute bottom-3 left-[1.35rem] top-9 w-px bg-[rgba(46, 158, 204,0.08)]",
                      i === (review.feedback?.length ?? 0) - 1 && "hidden"
                    )}
                  />
                  <div
                    className={cn(
                      "relative z-[1] flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-2",
                      accent.avatar
                    )}
                  >
                    {feedbackInitials(f.fromName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="text-sm font-semibold text-primary-dark">
                        {f.fromName}
                      </span>
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                          f.fromRole === "l1_reviewer"
                            ? "bg-[#e8f4f6] text-primary"
                            : "bg-[#fff4d6] text-[#8a6200]"
                        )}
                      >
                        {formatFeedbackRole(f.fromRole)}
                      </span>
                    </div>
                    <p
                      className={cn(
                        "mt-1.5 rounded-r-lg border border-l-2 border-[rgba(46, 158, 204,0.08)] bg-white px-3 py-2 text-sm leading-relaxed text-[#374151] shadow-[0_1px_2px_rgba(46, 158, 204,0.03)]",
                        f.fromRole === "l1_reviewer"
                          ? "border-l-primary"
                          : "border-l-secondary"
                      )}
                    >
                      {f.message}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {status === "changes_requested" && isThisActionsL1 && !isSubmitter && (
        <div className="border-t border-border pt-3">
          <p className="text-sm font-medium text-foreground/85">
            Waiting on the assignee
          </p>
        </div>
      )}

      {canSubmitL1 && (
        <div className="space-y-3 border-t border-border pt-3">
          {isResubmit && (
            <p className="text-sm font-medium text-foreground/85">{resubmitHint}</p>
          )}
          <Button
            type="button"
            size="sm"
            disabled={busy}
            onClick={() => setSubmitOpen(true)}
          >
            <Send className="h-4 w-4" />
            {isResubmit
              ? lockedResubmitL1Name
                ? `Resend to ${lockedResubmitL1Name}`
                : "Resend to L1 for review"
              : "Submit for L1 review"}
          </Button>
        </div>
      )}

      <Dialog
        open={submitOpen}
        onClose={() => !busy && setSubmitOpen(false)}
        className="max-w-md"
      >
        <div className="p-6 sm:p-7">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(46, 158, 204,0.08)] text-primary">
            <Send className="h-6 w-6" />
          </div>
          <h2 className="pr-8 text-xl font-semibold text-primary">
            {isResubmit
              ? lockedResubmitL1Name
                ? `Resend to ${lockedResubmitL1Name}?`
                : "Resend to L1 for review?"
              : "Submit for L1 review?"}
          </h2>
          {lockedResubmitL1Id ? (
            <div className="mt-4 rounded-xl border border-[rgba(46, 158, 204,0.1)] bg-[#f8fafb] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Level 1 reviewer
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1f2937]">
                {lockedResubmitL1Name || "Level 1 reviewer"}
              </p>
            </div>
          ) : choosesL1 && peerL1Options.length > 0 ? (
            <div className="mt-4 space-y-2">
              <Label>Level 1 reviewer</Label>
              <Select
                value={l1ReviewerId}
                onChange={setL1ReviewerId}
                options={peerL1Options.map((u) => ({
                  value: u.userId || "",
                  label: u.name,
                }))}
                placeholder="Choose reviewer"
              />
              {selectedPeer && (
                <p className="text-sm text-foreground/85">
                  Sending to{" "}
                  <span className="inline-flex items-center rounded-md bg-sky-50 px-1.5 py-0.5 font-semibold text-sky-700 ring-1 ring-inset ring-sky-200/80">
                    {selectedPeer.name}
                  </span>
                </p>
              )}
            </div>
          ) : designatedL1 ? (
            <div className="mt-4 rounded-xl border border-[rgba(46, 158, 204,0.1)] bg-[#f8fafb] px-3.5 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                Level 1 reviewer
              </p>
              <p className="mt-1 text-sm font-semibold text-[#1f2937]">
                {designatedL1.name}
              </p>
              <p className="text-sm font-medium text-rose-600">
                {designatedL1.email}
              </p>
            </div>
          ) : (
            <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm text-rose-800">
              No Level 1 reviewer is assigned to your account. Please contact
              an administrator.
            </p>
          )}

          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSubmitOpen(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={busy || !canConfirmSubmit}
              onClick={() =>
                run({
                  action: "submit_l1",
                  l1ReviewerId: resolvedSubmitL1Id,
                })
              }
            >
              {busy
                ? isResubmit
                  ? "Resending…"
                  : "Submitting…"
                : isResubmit
                  ? lockedResubmitL1Name
                    ? `Resend to ${lockedResubmitL1Name}`
                    : "Resend to L1 for review"
                  : "Submit for L1 review"}
            </Button>
          </div>
        </div>
      </Dialog>

      {canL1Review && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-base font-semibold text-primary">
            <ClipboardCheck className="h-4 w-4 text-secondary-dark" />
            Your Level 1 review for Action {actionIndex + 1}
          </div>
          {returnedByFinalApprover && (
            <div className="rounded-lg border border-secondary/30 bg-[#fff8e6] px-3.5 py-3">
              <p className="text-sm font-semibold text-[#8a6200]">
                Returned by{" "}
                {lastFeedback?.fromName || getFinalPublisherDisplayName()}
              </p>
            </div>
          )}
          <ScoreLegend />
          <Label>Score Rating</Label>
          <ScoreTierSelect value={score} onChange={setScore} />

          <div className="rounded-lg border border-[rgba(46,158,204,0.12)] bg-[#f8fafb] p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-semibold text-primary">
                <Pencil className="h-4 w-4" />
                Edit action
              </div>
              <Button
                type="button"
                size="sm"
                variant={showL1Edits ? "default" : "outline"}
                disabled={busy}
                onClick={() => setShowL1Edits((v) => !v)}
              >
                {showL1Edits ? "Hide editor" : "Edit"}
              </Button>
            </div>
            {showL1Edits && (
              <div className="mt-3 space-y-3 border-t border-[rgba(46,158,204,0.08)] pt-3">
                <div>
                  <Label>Action text</Label>
                  <Textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="mt-1.5 min-h-[90px] bg-white text-foreground"
                  />
                </div>
                <ActionEvidenceField
                  evidence={editEvidence}
                  onChange={setEditEvidence}
                />
              </div>
            )}
          </div>

          <Label>{showL1Edits ? "Note (optional)" : "Remark"}</Label>
          <Textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder={showL1Edits ? "Optional note" : "Remark"}
            className="min-h-[70px] bg-white text-foreground"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => sendToSuperadmin()}
            >
              <CheckCircle2 className="h-4 w-4" />
              {l1HasPendingEdits
                ? `Save & send to ${getFinalPublisherDisplayName()}`
                : `Send to ${getFinalPublisherDisplayName()}`}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !remark.trim()}
              onClick={() => run({ action: "l1_request_changes", remark })}
            >
              <MessageSquareWarning className="h-4 w-4" />
              Send back to assignee
            </Button>
          </div>
        </div>
      )}

      {canFinalPublish && (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex items-center gap-2 text-base font-semibold text-primary">
            <CheckCircle2 className="h-4 w-4 text-secondary-dark" />
            Final score (Action {actionIndex + 1})
          </div>
          {review.l1Score && (
            <p className="text-sm font-medium text-foreground/85">
              L1 score:{" "}
              <ScoreBadge scoreTier={review.l1Score} showValue size="sm" />
            </p>
          )}
          <ScoreLegend />
          <Label>Score Rating</Label>
          <ScoreTierSelect value={score} onChange={setScore} />
          <Label>Remark</Label>
          <Textarea
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="Remark"
            className="min-h-[70px] bg-white text-foreground"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() =>
                run({ action: "superadmin_publish", score, remark })
              }
            >
              Publish to public
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !remark.trim()}
              onClick={() =>
                run({ action: "superadmin_request_changes", remark })
              }
            >
              Send back to L1
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
