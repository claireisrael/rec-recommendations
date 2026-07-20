/**
 * Stamp / read the real sender name on notification bodies.
 * Appwrite notifications have no actorName attribute — we embed a stable
 * marker so the Review inbox never shows "Someone".
 */

const ACTOR_PREFIX_RE = /^@@from:(.+?)@@\n?/;

/**
 * @param {string | undefined | null} actorName
 * @param {string} body
 * @returns {string}
 */
export function stampNotificationActor(actorName, body) {
  const name = String(actorName || "").trim();
  const text = String(body || "").trim();
  if (!name) return text;
  // Avoid double-stamping
  if (ACTOR_PREFIX_RE.test(text)) return text;
  return `@@from:${name}@@\n${text}`;
}

/**
 * @param {string | undefined | null} body
 * @returns {{ actorName: string | null, body: string }}
 */
export function parseNotificationActor(body) {
  const raw = String(body || "");
  const stamped = raw.match(ACTOR_PREFIX_RE);
  if (stamped) {
    return {
      actorName: stamped[1].trim() || null,
      body: raw.slice(stamped[0].length).trim(),
    };
  }

  // Legacy bodies (before stamp): "Name submitted…", "Name (Level 1) sent…"
  const legacy = raw.match(
    /^(.+?)(?:\s+\([^)]*\))?\s+(assigned you|asked you|finished|reviewed|approved|published|asked for|updated|sent|edited|forwarded|responded|made|did not|submitted)/i
  );
  if (legacy?.[1]) {
    const name = legacy[1].trim();
    if (
      name &&
      !/^someone$/i.test(name) &&
      !/^a colleague$/i.test(name) &&
      !/^a team member$/i.test(name)
    ) {
      return { actorName: name, body: raw };
    }
  }

  return { actorName: null, body: raw };
}
