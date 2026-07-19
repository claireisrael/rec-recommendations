/**
 * Evidence items may be:
 * - a link URL string
 * - a legacy Appwrite fileId string
 * - an object { fileId, fileName } (preferred for uploads)
 *
 * @typedef {{ fileId: string, fileName: string }} EvidenceFile
 * @typedef {string | EvidenceFile} EvidenceItem
 */

/**
 * @param {EvidenceItem[] | undefined | null} evidence
 * @returns {boolean}
 */
export function hasEvidence(evidence) {
  return Boolean(evidence?.some((item) => Boolean(getEvidenceRef(item))));
}

/**
 * Stable reference used for storage / URLs (fileId or link URL).
 * @param {EvidenceItem | undefined | null} item
 * @returns {string}
 */
export function getEvidenceRef(item) {
  if (item == null) return "";
  if (typeof item === "string") return item.trim();
  if (typeof item === "object" && typeof item.fileId === "string") {
    return item.fileId.trim();
  }
  return "";
}

/**
 * Display name for a file upload (falls back to a generic label).
 * @param {EvidenceItem | undefined | null} item
 * @returns {string}
 */
export function getEvidenceFileName(item) {
  if (item && typeof item === "object" && typeof item.fileName === "string") {
    const name = item.fileName.trim();
    if (name) return name;
  }
  return "Document";
}

/**
 * @param {EvidenceItem | undefined | null} item
 * @returns {boolean}
 */
export function isEvidenceLink(item) {
  const ref = getEvidenceRef(item);
  return /^https?:\/\//i.test(ref);
}

/**
 * @param {EvidenceItem | undefined | null} item
 * @returns {boolean}
 */
export function isEvidenceFile(item) {
  const ref = getEvidenceRef(item);
  return Boolean(ref) && !isEvidenceLink(item);
}

/**
 * @param {string} url
 * @param {number} [max]
 */
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

/**
 * @param {unknown} raw
 * @returns {EvidenceItem | null}
 */
function normalizeEvidenceItem(raw) {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed ? trimmed : null;
  }
  if (raw && typeof raw === "object") {
    const fileId =
      typeof /** @type {{ fileId?: unknown }} */ (raw).fileId === "string"
        ? /** @type {{ fileId: string }} */ (raw).fileId.trim()
        : "";
    if (!fileId) return null;
    const fileName =
      typeof /** @type {{ fileName?: unknown }} */ (raw).fileName === "string"
        ? /** @type {{ fileName: string }} */ (raw).fileName.trim()
        : "";
    return fileName ? { fileId, fileName } : fileId;
  }
  return null;
}

/**
 * @param {string | undefined | null} raw
 * @returns {EvidenceItem[]}
 */
export function parseActionEvidence(raw) {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed
        .map(normalizeEvidenceItem)
        .filter(/** @type {(item: EvidenceItem | null) => item is EvidenceItem} */ ((item) => item != null));
    }
  } catch {
    const trimmed = raw.trim();
    return trimmed ? [trimmed] : [];
  }
  return [];
}

/**
 * @param {EvidenceItem[]} items
 * @returns {string}
 */
export function serializeActionEvidence(items) {
  const filtered = items
    .map(normalizeEvidenceItem)
    .filter(/** @type {(item: EvidenceItem | null) => item is EvidenceItem} */ ((item) => item != null));
  return filtered.length > 0 ? JSON.stringify(filtered) : "";
}
