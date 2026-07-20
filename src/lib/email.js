import "server-only";

import nodemailer from "nodemailer";
import { getFinalPublisherDisplayName } from "@/lib/roles";

/** Supports EMAIL_* (NREP projects) and SMTP_* aliases. */
function emailEnv(key) {
  const map = {
    HOST: ["EMAIL_HOST", "SMTP_HOST"],
    PORT: ["EMAIL_PORT", "SMTP_PORT"],
    USER: ["EMAIL_USER", "SMTP_USER"],
    PASSWORD: ["EMAIL_PASSWORD", "SMTP_PASS", "SMTP_PASSWORD"],
    FROM: ["EMAIL_FROM", "SMTP_FROM"],
    SECURE: ["EMAIL_SECURE", "SMTP_SECURE"],
  };
  for (const name of map[key]) {
    const v = process.env[name];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

export function isEmailConfigured() {
  return Boolean(
    emailEnv("HOST") &&
      emailEnv("USER") &&
      emailEnv("PASSWORD") &&
      (emailEnv("FROM") || emailEnv("USER"))
  );
}

function getTransporter() {
  const host = emailEnv("HOST");
  const port = Number(emailEnv("PORT") || 587);
  const user = emailEnv("USER");
  const pass = emailEnv("PASSWORD");
  const secureFlag = emailEnv("SECURE").toLowerCase();
  const secure =
    secureFlag === "1" ||
    secureFlag === "true" ||
    port === 465;

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

/**
 * @param {{ to: string, subject: string, text: string, html?: string }} input
 * @returns {Promise<{ sent: boolean, skipped?: boolean, error?: string }>}
 */
export async function sendReminderEmail(input) {
  if (!isEmailConfigured()) {
    return { sent: false, skipped: true };
  }

  const to = (input.to || "").trim();
  if (!to || !to.includes("@") || to.includes("example.com")) {
    console.warn("[email] skipped — invalid recipient:", to || "(empty)");
    return { sent: false, skipped: true, error: "Invalid recipient" };
  }

  const from = emailEnv("FROM") || `REC Portal <${emailEnv("USER")}>`;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from,
      to,
      subject: input.subject,
      text: input.text,
      html:
        input.html ||
        `<div style="font-family:Geist Sans,Inter,Segoe UI,system-ui,sans-serif;line-height:1.55;color:#000000">
          <p>${input.text.replace(/\n/g, "<br/>")}</p>
          <p style="margin-top:24px;font-size:12px;color:#6b7280">
            REC Recommendations Portal · NREP
          </p>
        </div>`,
    });
    return { sent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed";
    console.warn("[email]", message, "| to:", to);
    return { sent: false, error: message };
  }
}

/** Human labels for where a review sits in the workflow. */
export function reviewStageForType(type) {
  const publisher = getFinalPublisherDisplayName();

  switch (type) {
    case "l1_review_requested":
      return {
        waitingOn: "Level 1 reviewer",
        stageLabel: "Waiting on Level 1 review",
        badgeColor: "#E08E2A",
      };
    case "feedback_responded":
      return {
        waitingOn: "Level 1 reviewer",
        stageLabel: "Assignee responded — waiting on Level 1 re-review",
        badgeColor: "#E08E2A",
      };
    case "superadmin_review_requested":
      return {
        waitingOn: publisher,
        stageLabel: `Waiting on ${publisher} for final approval`,
        badgeColor: "#2E9ECC",
      };
    case "action_reviewed":
      return {
        waitingOn: publisher,
        stageLabel: `With ${publisher} for final publication`,
        badgeColor: "#2E9ECC",
      };
    case "changes_requested":
      return {
        waitingOn: "Contributor / section owner",
        stageLabel: "Sent back — waiting on your updates",
        badgeColor: "#d97706",
      };
    case "l1_edited_and_forwarded":
      return {
        waitingOn: publisher,
        stageLabel: `L1 edited and sent to ${publisher} for publication`,
        badgeColor: "#2E9ECC",
      };
    case "final_returned_to_l1":
      return {
        waitingOn: "Level 1 reviewer",
        stageLabel: "Final approver returned this to Level 1",
        badgeColor: "#E08E2A",
      };
    case "publisher_returned_fyi":
      return {
        waitingOn: "Level 1 reviewer",
        stageLabel: "Final approver returned this to your Level 1",
        badgeColor: "#E08E2A",
      };
    case "action_published":
      return {
        waitingOn: "None — complete",
        stageLabel: "Published (workflow complete)",
        badgeColor: "#15803d",
      };
    case "responsibility_assigned":
      return {
        waitingOn: "Assignee",
        stageLabel: "Assignment update",
        badgeColor: "#4BB3D9",
      };
    default:
      return {
        waitingOn: "REC Portal",
        stageLabel: "Workflow update",
        badgeColor: "#2E9ECC",
      };
  }
}

/**
 * @param {string | undefined | null} nameOrEmail
 * @returns {string}
 */
export function firstNameFromEmailOrName(nameOrEmail) {
  const raw = (nameOrEmail || "").trim();
  if (!raw) return "there";
  if (raw.includes("@")) {
    const local = raw.split("@")[0] || "";
    const part = local.split(/[._-]/)[0] || local;
    if (!part) return "there";
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }
  const first = raw.split(/\s+/)[0];
  return first || "there";
}

/**
 * @param {string} text
 * @returns {string}
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} label
 * @param {string} value
 */
function detailRow(label, value) {
  return `<tr>
    <td style="padding:6px 0;width:130px;vertical-align:top;font-size:11px;font-weight:700;color:#357C9D;text-transform:uppercase;letter-spacing:0.04em">${escapeHtml(label)}</td>
    <td style="padding:6px 0;font-size:15px;color:#1a1a1a;line-height:1.45">${escapeHtml(value)}</td>
  </tr>`;
}

/**
 * @param {{
 *   title: string,
 *   body: string,
 *   actionUrl?: string,
 *   recipientName?: string,
 *   actorName?: string,
 *   type?: import("./appwrite/notification-types").NotificationType,
 *   emailDetail?: import("./review-notify-copy").ReviewEmailDetail,
 * }} input
 * @returns {string}
 */
export function reviewEmailHtml(input) {
  const greetingName = firstNameFromEmailOrName(input.recipientName);
  const stage = input.type
    ? reviewStageForType(input.type)
    : {
        waitingOn: "REC Portal",
        stageLabel: "Workflow update",
        badgeColor: "#2E9ECC",
      };
  const d = input.emailDetail;

  const aboutBlock = d
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 18px;border-collapse:collapse">
        ${detailRow("Recommendation", d.recommendation)}
        ${detailRow("Action", d.action)}
        ${d.actionPreview ? detailRow("Preview", d.actionPreview) : ""}
      </table>`
    : "";

  const happenedBlock = d
    ? `<div style="margin:0 0 14px;padding:14px 16px;border-radius:10px;background:#fafcfd;border:1px solid #e8eef0">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#357C9D">What happened</p>
        <p style="margin:0;font-size:15px;line-height:1.55;color:#1a1a1a">${escapeHtml(d.whatHappened)}</p>
      </div>
      <div style="margin:0 0 14px;padding:14px 16px;border-radius:10px;background:#E8F6FB;border-left:4px solid ${stage.badgeColor}">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#357C9D">What you should do</p>
        <p style="margin:0;font-size:15px;line-height:1.55;color:#1a1a1a;font-weight:600">${escapeHtml(d.nextStep)}</p>
      </div>`
    : `<div style="margin:0 0 8px;padding:16px;border-radius:10px;background:#fafcfd;border:1px solid #e8eef0">
        <p style="margin:0;font-size:15px;line-height:1.6;color:#1a1a1a;white-space:pre-wrap">${escapeHtml(input.body)}</p>
      </div>`;

  const noteBlock =
    d?.note && d.noteFrom
      ? `<div style="margin:0 0 14px;padding:14px 16px;border-radius:10px;background:#fff8ef;border:1px solid rgba(239,167,79,0.35)">
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:#E08E2A">Note from ${escapeHtml(d.noteFrom)}</p>
          <p style="margin:0;font-size:15px;line-height:1.55;color:#1a1a1a">${escapeHtml(d.note)}</p>
        </div>`
      : "";

  const cta = input.actionUrl
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 8px">
        <tr>
          <td style="border-radius:10px;background:#2E9ECC">
            <a href="${escapeHtml(input.actionUrl)}"
               style="display:inline-block;padding:13px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px">
              Open in REC Portal →
            </a>
          </td>
        </tr>
      </table>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:24px 16px;background:#eef4f6;font-family:Geist Sans,Segoe UI,system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto">
    <div style="background:linear-gradient(135deg,#2E9ECC 0%,#357C9D 100%);border-radius:14px 14px 0 0;padding:20px 24px;border-bottom:4px solid #EFA74F">
      <p style="margin:0;font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.85);font-weight:600">REC Portal</p>
      <p style="margin:6px 0 0;font-size:17px;color:#ffffff;font-weight:600">Recommendations &amp; Actions</p>
    </div>
    <div style="border:1px solid #d8e4e8;border-top:none;border-radius:0 0 14px 14px;padding:24px;background:#ffffff">
      <p style="margin:0 0 16px;font-size:16px;color:#000000">Hello <strong>${escapeHtml(greetingName)}</strong>,</p>
      <h1 style="font-size:20px;line-height:1.35;margin:0 0 16px;color:#1a1a1a;font-weight:600">${escapeHtml(input.title)}</h1>
      <div style="margin:0 0 18px;padding:12px 14px;border-radius:10px;background:#E8F6FB;border-left:4px solid ${stage.badgeColor}">
        <p style="margin:0;font-size:14px;font-weight:600;color:${stage.badgeColor}">${escapeHtml(stage.stageLabel)}</p>
        <p style="margin:6px 0 0;font-size:13px;color:#3d5058">Waiting on: <strong style="color:#000">${escapeHtml(stage.waitingOn)}</strong></p>
      </div>
      ${aboutBlock}
      ${happenedBlock}
      ${noteBlock}
      ${cta}
      <hr style="margin:28px 0 20px;border:none;border-top:1px solid #e5e7eb"/>
      <p style="margin:0;font-size:12px;color:#6b7280;line-height:1.55">Automated message from the REC Recommendations &amp; Actions portal (NREP). Please do not reply.</p>
    </div>
  </div>
</body>
</html>`;
}

/**
 * @param {{
 *   title: string,
 *   body: string,
 *   actionUrl?: string,
 *   recipientName?: string,
 *   actorName?: string,
 *   type?: import("./appwrite/notification-types").NotificationType,
 *   emailDetail?: import("./review-notify-copy").ReviewEmailDetail,
 * }} input
 * @returns {string}
 */
export function reviewEmailText(input) {
  const greetingName = firstNameFromEmailOrName(input.recipientName);
  const stage = input.type
    ? reviewStageForType(input.type)
    : { waitingOn: "REC Portal", stageLabel: "Workflow update" };
  const d = input.emailDetail;

  /** @type {string[]} */
  const lines = [
    `Hello ${greetingName},`,
    "",
    input.title,
    "",
    `Stage: ${stage.stageLabel}`,
    `Waiting on: ${stage.waitingOn}`,
    "",
  ];

  if (d) {
    lines.push(`Recommendation: ${d.recommendation}`, `Action: ${d.action}`);
    if (d.actionPreview) lines.push(`Preview: ${d.actionPreview}`);
    lines.push("", "What happened:", d.whatHappened, "", "What you should do:", d.nextStep);
    if (d.note && d.noteFrom) {
      lines.push("", `Note from ${d.noteFrom}:`, d.note);
    }
  } else {
    lines.push(input.body);
  }

  if (input.actionUrl) {
    lines.push("", `Open in REC Portal: ${input.actionUrl}`);
  }
  lines.push("", "— REC Recommendations & Actions portal (NREP)");
  return lines.join("\n");
}
