/**
 * Plain-language copy for review notifications / emails.
 * Keep inbox body short; put structure in emailDetail for the mail template.
 */

/**
 * @typedef {{
 *   recommendation: string,
 *   action: string,
 *   actionPreview?: string,
 *   whatHappened: string,
 *   nextStep: string,
 *   note?: string,
 *   noteFrom?: string,
 * }} ReviewEmailDetail
 */

/**
 * @param {{
 *   displayCode: string,
 *   headline: string,
 *   detail: string,
 *   actionNo?: number,
 *   actionText?: string,
 *   title?: string,
 * }} ref
 * @param {{
 *   actorName: string,
 *   publisherName: string,
 *   remark?: string,
 *   editedWhat?: string,
 *   l1Name?: string,
 * }} ctx
 */
export function buildReviewNotifyCopy(ref, ctx) {
  const recLine = ref.headline || ref.displayCode;
  const actionLine =
    ref.actionNo != null
      ? `Action ${ref.actionNo}`
      : ref.detail || "Action";
  const preview = (ref.actionText || "").trim();
  const remark = (ctx.remark || "").trim();
  const l1Name = (ctx.l1Name || "your Level 1 reviewer").trim();

  const baseDetail = {
    recommendation: recLine,
    action: actionLine,
    actionPreview: preview || undefined,
  };

  return {
    /** Status FYI for the person who submitted — not for Clare/Silver unless they submitted. */
    actionReviewed: {
      title: `Update · ${ref.displayCode}`,
      body: `${ctx.actorName} (Level 1) forwarded ${actionLine} on ${recLine} to ${ctx.publisherName} for publication. You do not need to do anything.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} (your Level 1 reviewer) finished review and sent this action to ${ctx.publisherName} for final publication.`,
        nextStep: `No action needed from you. ${ctx.publisherName} will set the final score and publish.`,
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    /** Final publisher must publish. */
    superadminReview: {
      title: `Ready to publish · ${ref.displayCode}`,
      body: `${ctx.actorName} (Level 1) sent ${actionLine} on ${recLine} to you. Please set the final score and publish.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} (Level 1 reviewer) approved this action and sent it to you for final publication.`,
        nextStep:
          "Open the REC Portal, set the final score, then publish. Or send it back to Level 1 if something is missing.",
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    superadminReviewAfterEdit: {
      title: `Ready to publish · ${ref.displayCode}`,
      body: `${ctx.actorName} (Level 1) edited ${ctx.editedWhat || "the action"} on ${actionLine} (${recLine}) and sent it to you to publish.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} (Level 1) made edits to ${ctx.editedWhat || "the action"} and forwarded it to you for final publication.`,
        nextStep:
          "Open the REC Portal, review the edits, set the final score, then publish.",
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    /** Assignee: L1 edited and forwarded — FYI only. */
    l1EditedForwarded: {
      title: `L1 updated your action · ${ref.displayCode}`,
      body: `${ctx.actorName} edited ${ctx.editedWhat || "your action"} on ${actionLine} (${recLine}) and sent it to ${ctx.publisherName} for publication. You do not need to resubmit.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} (Level 1) edited ${ctx.editedWhat || "your action"} and sent it straight to ${ctx.publisherName} — it was not bounced back to you.`,
        nextStep: `No action needed from you unless ${ctx.publisherName} asks for changes.`,
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    l1ReviewRequested: {
      title: `Review needed · ${ref.displayCode}`,
      body: `${ctx.actorName} submitted ${actionLine} on ${recLine} for your Level 1 review. Open it, score the action, then approve or send back.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} submitted this action for your Level 1 review.`,
        nextStep:
          "Open the REC Portal, review the action, set a score, then either send it to the final publisher or send it back for changes.",
      },
    },

    feedbackResponded: {
      title: `Resubmitted · ${ref.displayCode}`,
      body: `${ctx.actorName} updated ${actionLine} on ${recLine} and resent it for your Level 1 review.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} addressed earlier feedback and resubmitted this action for Level 1 review.`,
        nextStep:
          "Open the REC Portal and review the updates. Then approve or send back again.",
        note: remark || undefined,
        noteFrom: remark ? "Earlier feedback" : undefined,
      },
    },

    changesRequestedL1: {
      title: `Sent back · ${ref.displayCode}`,
      body: `${ctx.actorName} (Level 1) sent ${actionLine} on ${recLine} back to you. Please update it and resubmit.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} (Level 1) asked you to update this action before it can move forward.`,
        nextStep:
          "Open the REC Portal, make the requested changes, then resubmit for Level 1 review.",
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    /** @deprecated publisher now returns to L1; kept for older callers */
    changesRequestedPublisher: {
      title: `Changes needed · ${ref.displayCode}`,
      body: `${ctx.actorName} asked for updates on ${actionLine} (${recLine}) before publication.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} reviewed this action and needs changes before it can be published.`,
        nextStep:
          "Open the REC Portal, make the requested changes, then resubmit through Level 1.",
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    /** Final publisher → L1 (actionable for L1). */
    finalReturnedToL1: {
      title: `Returned by ${ctx.actorName} · ${ref.displayCode}`,
      body: `${ctx.actorName} (final approver) sent ${actionLine} on ${recLine} back to you. Review their feedback, then either send it to the assignee or edit and return it to ${ctx.actorName} for publication.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} (final approver) reviewed this action and returned it to you (Level 1) instead of publishing.`,
        nextStep: `Open the REC Portal. You can send it back to the recommendation assignee, or edit it yourself and send it again to ${ctx.actorName} for publication.`,
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    /** Assignee FYI when final publisher returns the action to L1. */
    publisherReturnedFyi: {
      title: `Update · ${ref.displayCode}`,
      body: `${ctx.actorName} (final approver) sent ${actionLine} on ${recLine} back to ${l1Name} (Level 1) with feedback. ${l1Name} will decide next steps. You do not need to act unless they send it to you.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} (final approver) did not publish this action and returned it to ${l1Name} (your Level 1 reviewer).`,
        nextStep: `No action needed from you right now. Watch for a follow-up from ${l1Name} if they send it back to you.`,
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },

    published: {
      title: `Published · ${ref.displayCode}`,
      body: `${ctx.actorName} published ${actionLine} on ${recLine}. It is now live on the public portal.`,
      emailDetail: {
        ...baseDetail,
        whatHappened: `${ctx.actorName} published this action.`,
        nextStep: "No further action needed. You can view it on the public guest portal.",
        note: remark || undefined,
        noteFrom: remark ? ctx.actorName : undefined,
      },
    },
  };
}
