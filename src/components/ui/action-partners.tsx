"use client";

import { formatActionPartners, parseActionPartners } from "@/lib/partners";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionPartnersDisplayProps {
  partner: string;
  /** Guest action cards use a colored background; admin uses light surfaces. */
  variant?: "onColor" | "default";
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

export function ActionPartnersDisplay({
  partner,
  variant = "default",
  size = "sm",
  showLabel = true,
  className,
}: ActionPartnersDisplayProps) {
  const partners = parseActionPartners(partner);
  if (partners.length === 0) return null;

  const label =
    partners.length === 1
      ? "Implementation Partner"
      : "Implementation Partners";

  if (variant === "onColor") {
    return (
      <div className={cn("space-y-1.5", className)}>
        {showLabel && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 font-bold uppercase tracking-widest text-white ring-1 ring-inset ring-white/25",
              size === "sm" ? "text-[10px]" : "text-xs"
            )}
          >
            <Users className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            {label}
          </span>
        )}
        <p
          className={cn(
            "inline-block max-w-full rounded-lg bg-white px-2.5 py-1 font-semibold leading-snug text-gray-900 shadow-sm",
            size === "sm" ? "text-xs" : "text-sm"
          )}
        >
          {formatActionPartners(partner)}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1", className)}>
      {showLabel && (
        <span
          className={cn(
            "block font-bold uppercase tracking-widest text-primary/60",
            size === "sm" ? "text-[10px]" : "text-xs"
          )}
        >
          {label}
        </span>
      )}
      <span
        className={cn(
          "inline-flex max-w-full items-start gap-1.5 rounded-lg border border-primary/15 bg-primary/8 px-2.5 py-1 font-semibold text-primary break-words",
          size === "sm" ? "text-xs" : "text-sm"
        )}
      >
        <Users className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {formatActionPartners(partner)}
      </span>
    </div>
  );
}
