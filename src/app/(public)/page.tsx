import { LandingPage } from "@/components/public/LandingPage";
import { landingFont } from "@/lib/fonts/landing";

export default function HomePage() {
  return (
    <div className={landingFont.className}>
      <LandingPage />
    </div>
  );
}
