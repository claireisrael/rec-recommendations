"use client";

import {
  hasEvidence,
  isEvidenceLink,
  formatEvidenceLinkLabel,
  getEvidenceRef,
  getEvidenceFileName,
} from "@/lib/evidence";
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
  "inline-flex max-w-full items-center rounded-md font-semibold text-white bg-slate-600 hover:bg-slate-700 transition-colors";
const linkClass =
  "inline-flex max-w-full items-center rounded-md font-semibold text-white bg-primary hover:bg-primary-dark transition-colors";

/**
 * @param {{ evidence?: import("@/lib/evidence").EvidenceItem[], size?: "sm" | "md" }} props
 */
export function ActionEvidenceDisplay({ evidence = [], size = "sm" }) {
  if (!hasEvidence(evidence)) return null;

  const sizing = sizeClass[size];
  const icon = iconSize[size];

  return (
    <ul className="flex flex-wrap gap-1.5">
      {evidence.map((item, i) => {
        const ref = getEvidenceRef(item);
        if (!ref) return null;

        if (isEvidenceLink(item)) {
          return (
            <li key={`${ref}-${i}`}>
              <a
                href={ref}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} ${sizing}`}
                onClick={(e) => e.stopPropagation()}
                title={ref}
              >
                <ExternalLink className={`${icon} shrink-0`} />
                <span className="truncate max-w-[180px]">
                  {formatEvidenceLinkLabel(ref)}
                </span>
              </a>
            </li>
          );
        }

        const name = getEvidenceFileName(item);
        return (
          <li key={`${ref}-${i}`}>
            <a
              href={getEvidenceFileUrl(ref)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${documentClass} ${sizing}`}
              onClick={(e) => e.stopPropagation()}
              title={`Open ${name}`}
            >
              <FileText className={`${icon} shrink-0`} />
              <span className="truncate max-w-[200px]">{name}</span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
