"use client";

import { hasEvidence, isEvidenceLink, formatEvidenceLinkLabel } from "@/lib/evidence";
import { getEvidenceFileUrl } from "@/lib/appwrite/storage";
import { ExternalLink, FileText } from "lucide-react";

const sizeClass = {
  sm: "text-xs gap-1 px-2 py-0.5",
  md: "text-sm gap-1.5 px-2.5 py-1",
};

const iconSize = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
};

const documentClass =
  "inline-flex items-center rounded-md font-semibold text-white bg-slate-600 hover:bg-slate-700 transition-colors";
const linkClass =
  "inline-flex items-center rounded-md font-semibold text-white bg-primary hover:bg-primary-dark transition-colors";

/**
 * @param {{ evidence?: string[], size?: "sm" | "md" }} props
 */
export function ActionEvidenceDisplay({ evidence = [], size = "sm" }) {
  if (!hasEvidence(evidence)) return null;

  const sizing = sizeClass[size];
  const icon = iconSize[size];

  return (
    <ul className="flex flex-wrap gap-1.5">
      {evidence.map((item, i) =>
        isEvidenceLink(item) ? (
          <li key={i}>
            <a
              href={item}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} ${sizing}`}
              onClick={(e) => e.stopPropagation()}
              title={item}
            >
              <ExternalLink className={`${icon} shrink-0`} />
              <span className="truncate max-w-[180px]">
                {formatEvidenceLinkLabel(item)}
              </span>
            </a>
          </li>
        ) : (
          <li key={i}>
            <a
              href={getEvidenceFileUrl(item)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${documentClass} ${sizing}`}
              onClick={(e) => e.stopPropagation()}
            >
              <FileText className={`${icon} shrink-0`} />
              View document {evidence.length > 1 ? i + 1 : ""}
            </a>
          </li>
        )
      )}
    </ul>
  );
}
