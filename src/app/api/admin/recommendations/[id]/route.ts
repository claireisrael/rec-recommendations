import { NextResponse } from "next/server";
import {
  canDeleteRecommendation,
  canEditRecommendation,
} from "@/lib/recommendation-assignees";
import { buildRecommendationNumbering } from "@/lib/numbering";

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

async function getAccount(endpoint: string, projectId: string, jwt: string) {
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

async function getDocument(
  cfg: ReturnType<typeof env>,
  id: string
): Promise<Record<string, unknown> | null> {
  const res = await fetch(
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.collectionId}/documents/${id}`,
    {
      headers: {
        "X-Appwrite-Project": cfg.projectId,
        "X-Appwrite-Key": cfg.apiKey,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return null;
  return res.json();
}

async function resolveCodeForId(
  cfg: ReturnType<typeof env>,
  id: string,
  year: number
): Promise<string | undefined> {
  const queryYear = JSON.stringify({
    method: "equal",
    attribute: "rec-year",
    values: [year],
  });
  const queryLimit = JSON.stringify({ method: "limit", values: [200] });
  const res = await fetch(
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.collectionId}/documents?queries[]=${encodeURIComponent(queryYear)}&queries[]=${encodeURIComponent(queryLimit)}`,
    {
      headers: {
        "X-Appwrite-Project": cfg.projectId,
        "X-Appwrite-Key": cfg.apiKey,
      },
      cache: "no-store",
    }
  );
  if (!res.ok) return undefined;
  const body = await res.json();
  const docs = (body.documents || []).map(
    (d: {
      $id: string;
      recommendations?: string;
      category?: string;
      sectionCode?: string;
      "rec-year"?: number;
      $createdAt?: string;
    }) => ({
      $id: d.$id,
      recommendation: d.recommendations || "",
      category: d.category || "clean_cooking",
      sectionCode: d.sectionCode || undefined,
      year: d["rec-year"] || year,
      actions: [],
      status: "planned" as const,
      $createdAt: d.$createdAt,
    })
  );
  const info = buildRecommendationNumbering(docs).get(id);
  return info?.code;
}

async function resolveAccessTarget(
  cfg: ReturnType<typeof env>,
  id: string
): Promise<
  | { ok: true; target: { id: string; code?: string; sectionCode?: string; category?: string } }
  | { ok: false; response: NextResponse }
> {
  const doc = await getDocument(cfg, id);
  if (!doc) {
    return {
      ok: false,
      response: NextResponse.json({ message: "Not found" }, { status: 404 }),
    };
  }
  const year = Number(doc["rec-year"] || 0);
  const code = year ? await resolveCodeForId(cfg, id, year) : undefined;
  const sectionCode =
    (doc.sectionCode as string | undefined) ||
    (code ? code.split(".").slice(0, 2).join(".") : undefined);
  return {
    ok: true,
    target: {
      id,
      code,
      sectionCode,
      category: (doc.category as string | undefined) || undefined,
    },
  };
}

async function assertCanMutate(
  cfg: ReturnType<typeof env>,
  email: string,
  id: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const resolved = await resolveAccessTarget(cfg, id);
  if (!resolved.ok) return resolved;
  if (!canEditRecommendation(email, resolved.target)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "You can only edit recommendations in the sections assigned to you. Contact the superadmin if you need access.",
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

async function assertCanDelete(
  cfg: ReturnType<typeof env>,
  email: string,
  id: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const resolved = await resolveAccessTarget(cfg, id);
  if (!resolved.ok) return resolved;
  if (!canDeleteRecommendation(email, resolved.target)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          message:
            "Only superadmins can delete recommendations. Contact a superadmin if you need one removed.",
        },
        { status: 403 }
      ),
    };
  }
  return { ok: true };
}

/**
 * Admin delete — verifies JWT + assignment rules, then deletes with API key.
 */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing document id" }, { status: 400 });
  }

  const cfg = env();
  if (!cfg.endpoint || !cfg.projectId || !cfg.databaseId || !cfg.collectionId) {
    return NextResponse.json(
      { message: "Appwrite is not configured on the server" },
      { status: 500 }
    );
  }
  if (!cfg.apiKey) {
    return NextResponse.json(
      {
        message:
          "APPWRITE_API_KEY is missing on the server. Add it to .env so deletes can update Appwrite.",
      },
      { status: 500 }
    );
  }

  const jwt =
    request.headers.get("x-appwrite-jwt") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  if (!jwt) {
    return NextResponse.json(
      { message: "Not authenticated. Please log in again." },
      { status: 401 }
    );
  }

  const account = await getAccount(cfg.endpoint, cfg.projectId, jwt);
  if (!account) {
    return NextResponse.json(
      { message: "Your session has expired. Please log in again." },
      { status: 401 }
    );
  }

  const gate = await assertCanDelete(cfg, account.email, id);
  if (!gate.ok) return gate.response;

  const deleteRes = await fetch(
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.collectionId}/documents/${id}`,
    {
      method: "DELETE",
      headers: {
        "X-Appwrite-Project": cfg.projectId,
        "X-Appwrite-Key": cfg.apiKey,
      },
      cache: "no-store",
    }
  );

  if (!deleteRes.ok && deleteRes.status !== 204) {
    const body = await deleteRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        message:
          (body as { message?: string }).message ||
          `Appwrite refused delete (${deleteRes.status})`,
      },
      { status: deleteRes.status }
    );
  }

  return NextResponse.json({ deleted: true, id });
}

/**
 * Admin update — verifies JWT + assignment rules, then patches with API key.
 */
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ message: "Missing document id" }, { status: 400 });
  }

  const cfg = env();
  if (!cfg.endpoint || !cfg.projectId || !cfg.databaseId || !cfg.collectionId) {
    return NextResponse.json(
      { message: "Appwrite is not configured on the server" },
      { status: 500 }
    );
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

  const gate = await assertCanMutate(cfg, account.email, id);
  if (!gate.ok) return gate.response;

  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ message: "Invalid body" }, { status: 400 });
  }

  const patchRes = await fetch(
    `${cfg.endpoint}/databases/${cfg.databaseId}/collections/${cfg.collectionId}/documents/${id}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-Appwrite-Project": cfg.projectId,
        "X-Appwrite-Key": cfg.apiKey,
      },
      body: JSON.stringify({ data: payload }),
      cache: "no-store",
    }
  );

  if (!patchRes.ok) {
    const body = await patchRes.json().catch(() => ({}));
    return NextResponse.json(
      {
        message:
          (body as { message?: string }).message ||
          `Update failed (${patchRes.status})`,
      },
      { status: patchRes.status }
    );
  }

  return NextResponse.json(await patchRes.json());
}
