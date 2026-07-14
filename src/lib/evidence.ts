export function hasEvidence(evidence?: string[]): boolean {
  return Boolean(evidence?.some((item) => item.trim()));
}

export function isEvidenceLink(evidence: string): boolean {
  return /^https?:\/\//i.test(evidence.trim());
}

/** Short label for displaying a URL in the UI. */
export function formatEvidenceLinkLabel(url: string, max = 56): string {
  try {
    const u = new URL(url.trim());
    const path =
      u.pathname === "/" && !u.search ? "" : `${u.pathname}${u.search}`;
    const display = `${u.hostname}${path}`;
    return display.length > max ? `${display.slice(0, max - 1)}…` : display;
  } catch {
    const trimmed = url.trim();
    return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
  }
}

/** Parse stored evidence — supports JSON array or legacy single value. */
export function parseActionEvidence(raw?: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((item) => typeof item === "string" && item.trim());
    }
  } catch {
    return [raw.trim()];
  }
  return [];
}

export function serializeActionEvidence(items: string[]): string {
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  return filtered.length > 0 ? JSON.stringify(filtered) : "";
}
