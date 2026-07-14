/** Clip paths for the info panel — torn edge IS the split line (objectBoundingBox 0–1). */

export function buildDesktopTornClipPath(steps = 80): string {
  let d = "M 0 0 L 1 0";

  for (let i = 1; i <= steps; i++) {
    const y = i / steps;
    const wave = Math.sin(i * 0.88) * 0.011 + Math.cos(i * 1.52) * 0.008;
    const x = 1 - 0.018 - (i % 2 === 0 ? 0.022 : 0.013) - wave;
    d += ` L ${x.toFixed(4)} ${y.toFixed(4)}`;
  }

  d += " L 0 1 Z";
  return d;
}

export function buildMobileTornClipPath(steps = 80): string {
  let d = "M 0 0 L 1 0 L 1";

  for (let i = 1; i <= steps; i++) {
    const x = i / steps;
    const wave = Math.sin(i * 0.88) * 0.011 + Math.cos(i * 1.52) * 0.008;
    const y = 1 - 0.018 - (i % 2 === 0 ? 0.022 : 0.013) - wave;
    d += ` L ${x.toFixed(4)} ${y.toFixed(4)}`;
  }

  d += " L 0 1 Z";
  return d;
}

const desktopTornClipPath = buildDesktopTornClipPath();
const mobileTornClipPath = buildMobileTornClipPath();

export function LandingTornClipDefs() {
  return (
    <svg
      className="absolute w-0 h-0 overflow-hidden"
      aria-hidden
      focusable="false"
    >
      <defs>
        <clipPath
          id="landing-split-desktop"
          clipPathUnits="objectBoundingBox"
        >
          <path d={desktopTornClipPath} />
        </clipPath>
        <clipPath id="landing-split-mobile" clipPathUnits="objectBoundingBox">
          <path d={mobileTornClipPath} />
        </clipPath>
      </defs>
    </svg>
  );
}
