"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/**
 * @param {{ children: import("react").ReactNode, onComplete?: () => void }} props
 */
export function LandingCurtain({ children, onComplete }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const start = requestAnimationFrame(() => setOpen(true));
    const done = setTimeout(() => onComplete?.(), 3200);
    return () => {
      cancelAnimationFrame(start);
      clearTimeout(done);
    };
  }, [onComplete]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[200] pointer-events-none overflow-hidden",
        open && "landing-curtains-open"
      )}
      aria-hidden
    >
      <div className="landing-curtain-seam absolute inset-y-0 left-1/2 w-[3px] -translate-x-1/2 z-20 bg-secondary shadow-[0_0_40px_rgba(255,184,3,0.7)]" />

      <div className="landing-curtain-left absolute inset-y-0 left-0 w-1/2 overflow-hidden shadow-[6px_0_30px_rgba(0,0,0,0.35)]">
        <div className="absolute top-0 left-0 h-full w-screen">{children}</div>
      </div>

      <div className="landing-curtain-right absolute inset-y-0 right-0 w-1/2 overflow-hidden shadow-[-6px_0_30px_rgba(0,0,0,0.35)]">
        <div className="absolute top-0 left-0 h-full w-screen -translate-x-1/2">
          {children}
        </div>
      </div>
    </div>
  );
}
