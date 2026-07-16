import { NextResponse } from "next/server";
import {
  describeAssigneeResponsibilities,
  listUniqueAssignees,
} from "@/lib/category-assignees";
import { RECOMMENDATION_ITEM_ASSIGNEES } from "@/lib/recommendation-assignees";
import { notifyByEmail } from "@/lib/appwrite/notifications-server";
import { isSuperadmin, normalizeEmail } from "@/lib/roles";
import { categoryFromSectionCode } from "@/lib/numbering";
import { CATEGORY_LABELS } from "@/lib/categories";

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

/**
 * Superadmin: email everyone listed as category or item assignees.
 */
export async function POST(request) {
  const cfg = env();
  if (!cfg.endpoint || !cfg.projectId) {
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
  if (!isSuperadmin(account.email)) {
    return NextResponse.json({ message: "Superadmin only" }, { status: 403 });
  }

  const byEmail = new Map();

  for (const a of listUniqueAssignees()) {
    if (!a.email?.includes("@")) continue;
    const key = normalizeEmail(a.email);
    const responsibilities = describeAssigneeResponsibilities(a.categories);
    byEmail.set(key, {
      name: a.name,
      email: a.email,
      userId: a.userId,
      body: `Hello ${a.name}, you have been assigned to act on: ${responsibilities}. Open Assignments in the REC Portal to see all recommendation sections and the ones marked as yours.`,
    });
  }

  for (const a of RECOMMENDATION_ITEM_ASSIGNEES) {
    if (!a.email.includes("@")) continue;
    const key = normalizeEmail(a.email);
    const topics = a.sections
      .map((s) => {
        const cat = categoryFromSectionCode(s);
        const label = cat ? CATEGORY_LABELS[cat] : s;
        return `${label} (R ${s})`;
      })
      .join("; ");
    const detail = `Hello ${a.name}, your assigned topic(s): ${topics}. Open Assignments in the REC Portal to jump straight to them.`;
    const existing = byEmail.get(key);
    if (existing) {
      existing.body = detail;
      existing.userId = existing.userId || a.userId;
    } else {
      byEmail.set(key, {
        name: a.name,
        email: a.email,
        userId: a.userId,
        body: detail,
      });
    }
  }

  const assignees = [...byEmail.values()];
  if (assignees.length === 0) {
    return NextResponse.json(
      {
        message:
          "No assignees with emails yet. Add names and emails to the assignee lists first.",
        sent: 0,
      },
      { status: 400 }
    );
  }

  const results = [];

  for (const a of assignees) {
    const title = "You have been assigned REC responsibilities";
    const outcome = await notifyByEmail(cfg.apiKey, {
      email: a.email,
      userId: a.userId,
      type: "responsibility_assigned",
      title,
      body: a.body,
      linkPath: "/admin/assignments",
    });

    results.push({
      email: a.email,
      name: a.name,
      emailed: outcome.emailed,
      inApp: outcome.inApp,
    });
  }

  return NextResponse.json({
    sent: results.filter((r) => r.emailed || r.inApp).length,
    total: results.length,
    results,
  });
}
