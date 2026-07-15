"use client";

import { parseActionPartners } from "@/lib/partners";
import { accentChipClass } from "@/lib/accent-colors";
import { Handshake, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ActionPartnersDisplayProps {
  partner: string;
  /** Guest action cards use a colored background; admin uses light surfaces. */
  variant?: "onColor" | "default";
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

interface PartnersListProps {
  partners: string[];
  variant?: "onColor" | "default";
  size?: "sm" | "md";
  showLabel?: boolean;
  className?: string;
}

function partnerLabel(count: number) {
  return count === 1 ? "Implementation Partner" : "Implementation Partners";
}

export function PartnersList({
  partners,
  variant = "default",
  size = "sm",
  showLabel = true,
  className,
}: PartnersListProps) {
  if (partners.length === 0) return null;

  const chip =
    size === "sm"
      ? "text-[11px] px-2.5 py-1"
      : "text-sm px-3 py-1.5";

  if (variant === "onColor") {
    return (
      <div className={cn("space-y-2", className)}>
        {showLabel && (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md bg-black/35 px-2 py-0.5 font-bold uppercase tracking-[0.14em] text-white ring-1 ring-inset ring-white/30",
              size === "sm" ? "text-[10px]" : "text-xs"
            )}
          >
            <Handshake className={size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5"} />
            {partnerLabel(partners.length)}
          </span>
        )}
        <ul className="flex flex-wrap gap-1.5">
          {partners.map((name, i) => (
            <li
              key={name}
              className={cn(
                "inline-flex max-w-full items-center rounded-lg border font-semibold leading-snug shadow-sm",
                accentChipClass(name, i),
                chip
              )}
            >
              <span className="break-words">{name}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  const chips = (
    <ul className="flex flex-wrap gap-1.5">
      {partners.map((name, i) => (
        <li
          key={name}
          className={cn(
            "inline-flex max-w-full items-center rounded-md border font-medium",
            accentChipClass(name, i),
            chip
          )}
        >
          <span className="break-words leading-snug">{name}</span>
        </li>
      ))}
    </ul>
  );

  if (!showLabel) {
    return <div className={className}>{chips}</div>;
  }

  return (
    <div
      className={cn(
        "rounded-xl border border-[rgba(5,70,83,0.08)] bg-white p-3",
        className
      )}
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[rgba(5,70,83,0.08)] text-primary">
          <Users className="h-3.5 w-3.5" />
        </span>
        <div>
          <p
            className={cn(
              "font-bold uppercase tracking-[0.12em] text-primary",
              size === "sm" ? "text-[10px]" : "text-xs"
            )}
          >
            {partnerLabel(partners.length)}
          </p>
          <p className="text-[11px] text-muted">
            {partners.length} organisation
            {partners.length === 1 ? "" : "s"} delivering this action
          </p>
        </div>
      </div>
      {chips}
    </div>
  );
}

export function ActionPartnersDisplay({
  partner,
  variant = "default",
  size = "sm",
  showLabel = true,
  className,
}: ActionPartnersDisplayProps) {
  return (
    <PartnersList
      partners={parseActionPartners(partner)}
      variant={variant}
      size={size}
      showLabel={showLabel}
      className={className}
    />
  );
}
