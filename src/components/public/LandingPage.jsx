"use client";

import { useState } from "react";
import { LandingCurtain } from "@/components/public/LandingCurtain";
import { LandingPageContent } from "@/components/public/LandingPageContent";

export function LandingPage() {
  const [showCurtain, setShowCurtain] = useState(true);

  return (
    <div className="min-h-screen bg-primary-dark overflow-hidden">
      <LandingPageContent />

      {showCurtain && (
        <LandingCurtain onComplete={() => setShowCurtain(false)}>
          <LandingPageContent preview />
        </LandingCurtain>
      )}
    </div>
  );
}
