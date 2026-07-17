"use client";

import Link from "next/link";
import { NrepLogo } from "@/components/brand/NrepLogo";
import { LandingPhotoSlider } from "@/components/public/LandingPhotoSlider";
import { LandingTornClipDefs } from "@/components/public/landingTornClip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowRight, LayoutDashboard, Leaf } from "lucide-react";

/**
 * @param {{
 *   className?: string;
 *   preview?: boolean;
 * }} props
 */
export function LandingPageContent({ className, preview = false }) {
  return (
    <div
      className={cn(
        "relative min-h-screen w-screen shrink-0 flex flex-col lg:block",
        className
      )}
    >
      <LandingTornClipDefs />

      {/* Photo panel — extends under the torn edge of the info panel */}
      <div className="relative order-2 lg:absolute lg:inset-y-0 lg:right-0 lg:left-[38%] xl:left-[40%] min-h-[45vh] lg:min-h-screen">
        <LandingPhotoSlider preview={preview} />
      </div>

      {/* Info panel — torn clip on the split edge reveals photos underneath */}
      <div className="landing-panel-info relative z-10 order-1 flex flex-col justify-between w-full lg:w-[48%] xl:w-[45%] min-h-[55vh] lg:min-h-screen bg-gradient-to-br from-[#033540] via-primary-dark to-primary px-8 sm:px-12 lg:px-14 xl:px-20 py-10 lg:py-12">
        <div
          className="absolute inset-0 overflow-hidden pointer-events-none"
          aria-hidden
        >
          <span className="absolute w-64 h-64 rounded-full bg-secondary/10 blur-3xl -top-20 -left-20 landing-orb" />
          <span className="absolute w-48 h-48 rounded-full bg-white/5 blur-2xl bottom-32 right-0 landing-orb-delayed" />
          <span className="absolute w-20 h-20 rounded-full bg-secondary/20 blur-xl top-1/2 left-1/4 landing-orb" />
        </div>

        <header className="relative z-10 w-fit pt-1 pb-8">
          <div className="inline-flex items-center justify-center rounded-2xl bg-white px-6 py-4 ring-1 ring-black/5">
            <NrepLogo height={84} priority={!preview} />
          </div>
        </header>

        <div className="relative z-10 flex-1 flex flex-col justify-center py-10 lg:py-0">
          <p className="landing-eyebrow text-xs sm:text-sm font-extrabold tracking-[0.35em] uppercase mb-6">
            Renewable Energy Conference
          </p>

          <h1 className="landing-heading text-4xl sm:text-5xl xl:text-[3.5rem] font-extrabold leading-[1.05] tracking-tight mb-6">
            Recommendations
            <span className="landing-heading-accent block mt-2">&amp; Actions</span>
          </h1>

          <p className="landing-body text-base sm:text-lg font-medium leading-relaxed max-w-md mb-10">
            Follow every REC recommendation through to delivery — who is
            advancing it, the organisations behind each action, and progress
            across conference years.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Link href="/guest" className="group">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 bg-secondary text-white hover:bg-secondary-dark font-semibold shadow-lg shadow-secondary/20 transition-all duration-300 group-hover:scale-[1.03]"
              >
                <LayoutDashboard className="h-5 w-5" />
                Guest Dashboard
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
            <Link href="/login" className="group">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 border-white/30 bg-white text-primary hover:bg-white/90 hover:text-primary transition-all duration-300 group-hover:scale-[1.03]"
              >
                Login
              </Button>
            </Link>
          </div>
        </div>

        <footer className="relative z-10 pt-8 lg:pt-6">
          <div className="landing-tagline" aria-label="The Future is Renewable">
            <div className="landing-tagline-glow" aria-hidden />
            <p className="landing-tagline-lead">The Future is</p>
            <div className="landing-tagline-hero-row">
              <span className="landing-tagline-rule" aria-hidden />
              <Leaf className="landing-tagline-icon" aria-hidden />
              <span className="landing-tagline-hero">Renewable</span>
              <span
                className="landing-tagline-rule landing-tagline-rule--fade"
                aria-hidden
              />
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
