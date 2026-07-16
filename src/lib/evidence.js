export function hasEvidence(evidence) {
  return Boolean(evidence?.some((item) => item.trim()));
}

export function isEvidenceLink(evidence) {
  return /^https?:\/\//i.test(evidence.trim());
}

export function formatEvidenceLinkLabel(url, max = 56) {
  try {
    const u = new URL(url.trim());
    const path =
      u.pathname === "/" && !u.search ? "" : `${u.pathname}${u.search}`;
    const display = `${u.hostname}${path}`;
    return display.length > max ? `${display.slice(0, max - 1)}...` : display;
  } catch {
    const trimmed = url.trim();
    return trimmed.length > max ? `${trimmed.slice(0, max - 1)}...` : trimmed;
  }
}

export function parseActionEvidence(raw) {
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

export function serializeActionEvidence(items) {
  const filtered = items.map((item) => item.trim()).filter(Boolean);
  return filtered.length > 0 ? JSON.stringify(filtered) : "";
}
