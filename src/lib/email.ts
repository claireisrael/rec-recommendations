import "server-only";

import nodemailer from "nodemailer";
import type { NotificationType } from "@/lib/appwrite/notification-types";

/** Supports EMAIL_* (NREP projects) and SMTP_* aliases. */
function emailEnv(key: "HOST" | "PORT" | "USER" | "PASSWORD" | "FROM" | "SECURE") {
  const map: Record<typeof key, string[]> = {
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

export function isEmailConfigured(): boolean {
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

export async function sendReminderEmail(input: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<{ sent: boolean; skipped?: boolean; error?: string }> {
  if (!isEmailConfigured()) {
    return { sent: false, skipped: true };
  }

  const from = emailEnv("FROM") || `REC Portal <${emailEnv("USER")}>`;

  try {
    const transporter = getTransporter();
    await transporter.sendMail({
      from,
      to: input.to,
      subject: input.subject,
      text: input.text,
      html:
        input.html ||
        `<div style="font-family:Inter,Segoe UI,system-ui,sans-serif;line-height:1.55;color:#1f2937">
          <p>${input.text.replace(/\n/g, "<br/>")}</p>
          <p style="margin-top:24px;font-size:12px;color:#6b7280">
            REC Recommendations Portal · NREP
          </p>
        </div>`,
    });
    return { sent: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Email failed";
    console.error("[email]", message);
    return { sent: false, error: message };
  }
}

/** Human labels for where a review sits in the workflow. */
export function reviewStageForType(type: NotificationType): {
  waitingOn: string;
  stageLabel: string;
  badgeColor: string;
} {
  switch (type) {
    case "l1_review_requested":
      return {
        waitingOn: "Level 1 reviewer",
        stageLabel: "Waiting on Level 1 review",
        badgeColor: "#e08e24",
      };
    case "superadmin_review_requested":
      return {
        waitingOn: "Superadmin",
        stageLabel: "Waiting on Superadmin final approval",
        badgeColor: "#054653",
      };
    case "action_reviewed":
      return {
        waitingOn: "Superadmin",
        stageLabel: "Waiting on Superadmin final approval",
        badgeColor: "#054653",
      };
    case "changes_requested":
      return {
        waitingOn: "Contributor / section owner",
        stageLabel: "Waiting on updates from the submitter",
        badgeColor: "#d97706",
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
        badgeColor: "#0b7186",
      };
    default:
      return {
        waitingOn: "REC Portal",
        stageLabel: "Workflow update",
        badgeColor: "#054653",
      };
  }
}

export function firstNameFromEmailOrName(
  nameOrEmail: string | undefined | null
): string {
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

export function reviewEmailHtml(input: {
  title: string;
  body: string;
  actionUrl?: string;
  recipientName?: string;
  type?: NotificationType;
}): string {
  const greetingName = firstNameFromEmailOrName(input.recipientName);
  const stage = input.type
    ? reviewStageForType(input.type)
    : {
        waitingOn: "REC Portal",
        stageLabel: "Workflow update",
        badgeColor: "#054653",
      };

  const cta = input.actionUrl
    ? `<p style="margin:28px 0 8px">
        <a href="${input.actionUrl}"
           style="display:inline-block;background:#054653;color:#ffffff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
          Open in REC Portal
        </a>
      </p>`
    : "";

  return `<div style="font-family:Inter,Segoe UI,system-ui,sans-serif;line-height:1.55;color:#1f2937;max-width:560px;margin:0 auto">
  <div style="background:linear-gradient(135deg,#054653 0%,#0b7186 100%);border-radius:14px 14px 0 0;padding:18px 22px;border-bottom:3px solid #FFB803">
    <p style="margin:0;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#FFB803;font-weight:800">
      REC Portal
    </p>
    <p style="margin:6px 0 0;font-size:15px;color:#ffffff;font-weight:600">
      Recommendations &amp; Actions
    </p>
  </div>

  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 14px 14px;padding:22px;background:#ffffff">
    <p style="margin:0 0 16px;font-size:16px;font-weight:600;color:#1f2937">
      Hello ${greetingName},
    </p>

    <h1 style="font-family:Inter,Segoe UI,system-ui,sans-serif;font-size:22px;line-height:1.3;margin:0 0 16px;color:#054653;font-weight:800">
      ${input.title}
    </h1>

    <div style="margin:0 0 18px;padding:12px 14px;border-radius:10px;background:#f0f7f8;border:1px solid rgba(5,70,83,0.12)">
      <p style="margin:0 0 4px;font-size:11px;letter-spacing:0.1em;text-transform:uppercase;color:#054653;font-weight:800">
        Current stage
      </p>
      <p style="margin:0;font-size:15px;font-weight:700;color:${stage.badgeColor}">
        ${stage.stageLabel}
      </p>
      <p style="margin:6px 0 0;font-size:14px;font-weight:600;color:#1f2937">
        Waiting on: ${stage.waitingOn}
      </p>
    </div>

    <p style="margin:0 0 8px;font-size:15px;font-weight:500;color:#1f2937">
      ${input.body}
    </p>

    ${cta}

    <p style="margin-top:28px;font-size:12px;color:#3d5058;line-height:1.5">
      This is an automated message from the REC Recommendations &amp; Actions portal (NREP).
      Please do not reply to this email.
    </p>
  </div>
</div>`;
}

export function reviewEmailText(input: {
  title: string;
  body: string;
  actionUrl?: string;
  recipientName?: string;
  type?: NotificationType;
}): string {
  const greetingName = firstNameFromEmailOrName(input.recipientName);
  const stage = input.type
    ? reviewStageForType(input.type)
    : { waitingOn: "REC Portal", stageLabel: "Workflow update" };

  return [
    `Hello ${greetingName},`,
    "",
    input.title,
    "",
    `Current stage: ${stage.stageLabel}`,
    `Waiting on: ${stage.waitingOn}`,
    "",
    input.body,
    input.actionUrl ? `\nOpen: ${input.actionUrl}` : "",
    "",
    "— REC Recommendations & Actions portal (NREP)",
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}
