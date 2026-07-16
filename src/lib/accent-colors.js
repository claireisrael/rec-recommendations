export const ACCENT_BG = [
  "bg-primary",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-sky-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-indigo-500",
  "bg-cyan-500",
];

export const ACCENT_CHIP = [
  "border-primary/25 bg-primary/10 text-primary",
  "border-emerald-500/30 bg-emerald-50 text-emerald-800",
  "border-amber-500/30 bg-amber-50 text-amber-900",
  "border-sky-500/30 bg-sky-50 text-sky-800",
  "border-violet-500/30 bg-violet-50 text-violet-800",
  "border-rose-500/30 bg-rose-50 text-rose-800",
  "border-teal-500/30 bg-teal-50 text-teal-800",
  "border-orange-500/30 bg-orange-50 text-orange-900",
  "border-indigo-500/30 bg-indigo-50 text-indigo-800",
  "border-cyan-500/30 bg-cyan-50 text-cyan-800",
];

export const ACCENT_TEXT = [
  "text-primary",
  "text-emerald-700",
  "text-amber-700",
  "text-sky-700",
  "text-violet-700",
  "text-rose-600",
  "text-teal-700",
  "text-orange-700",
  "text-indigo-700",
  "text-cyan-700",
];

export function accentIndex(key, offset = 0) {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash + key.charCodeAt(i) * (i + 1)) % ACCENT_TEXT.length;
  }
  return (hash + offset) % ACCENT_TEXT.length;
}

export function accentTextClass(key, offset = 0) {
  return ACCENT_TEXT[accentIndex(key, offset)];
}

export function accentChipClass(key, offset = 0) {
  return ACCENT_CHIP[accentIndex(key, offset)];
}
