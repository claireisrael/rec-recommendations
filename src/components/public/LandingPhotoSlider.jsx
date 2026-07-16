"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { REC_SLIDER_IMAGES } from "@/lib/landingImages";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";

const SLIDE_INTERVAL_MS = 5500;
const EXIT_DURATION_MS = 1400;

/**
 * @param {{ preview?: boolean }} props
 */
export function LandingPhotoSlider({ preview = false }) {
  const [index, setIndex] = useState(0);
  const [exitingIndex, setExitingIndex] = useState(null);
  const [paused, setPaused] = useState(false);
  const exitTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
  const total = REC_SLIDER_IMAGES.length;

  const beginExit = useCallback((from) => {
    if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    setExitingIndex(from);
    exitTimerRef.current = setTimeout(() => {
      setExitingIndex(null);
    }, EXIT_DURATION_MS);
  }, []);

  const changeSlide = useCallback(
    (next) => {
      const normalized = ((next % total) + total) % total;
      setIndex((current) => {
        if (normalized === current) return current;
        beginExit(current);
        return normalized;
      });
    },
    [total, beginExit]
  );

  useEffect(() => {
    return () => {
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (preview || paused || total <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % total;
        beginExit(current);
        return next;
      });
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [preview, paused, total, beginExit]);

  if (preview) {
    return (
      <div className="absolute inset-0 overflow-hidden">
        <Image
          src={REC_SLIDER_IMAGES[0].src}
          alt={REC_SLIDER_IMAGES[0].alt}
          fill
          priority
          quality={95}
          className="object-cover object-center"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />
      </div>
    );
  }

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {REC_SLIDER_IMAGES.map((image, i) => {
        const isActive = i === index;
        const isExiting = i === exitingIndex;
        if (!isActive && !isExiting) return null;

        return (
          <div
            key={image.src}
            className={cn(
              "absolute inset-0",
              isActive && "z-[2]",
              isExiting && "z-[1]"
            )}
          >
            <div
              key={isActive ? `in-${index}` : `out-${exitingIndex}`}
              className={cn(
                "absolute inset-0 will-change-transform",
                isActive && "landing-slide-approach",
                isExiting && "landing-slide-exit"
              )}
            >
              <Image
                src={image.src}
                alt={image.alt}
                fill
                priority={i === 0}
                quality={95}
                className="object-cover object-center"
                sizes="(max-width: 1024px) 100vw, 55vw"
              />
            </div>
          </div>
        );
      })}

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={() => changeSlide(index - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-colors"
            aria-label="Previous photo"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => changeSlide(index + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-2 rounded-full bg-black/30 text-white hover:bg-black/50 backdrop-blur-sm transition-colors"
            aria-label="Next photo"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
            {REC_SLIDER_IMAGES.map((image, i) => (
              <button
                key={image.src}
                type="button"
                onClick={() => changeSlide(i)}
                className={cn(
                  "h-2 rounded-full transition-all duration-300",
                  i === index
                    ? "w-7 bg-secondary"
                    : "w-2 bg-white/50 hover:bg-white/80"
                )}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
