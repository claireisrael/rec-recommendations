"use client";

import { useEffect, useRef } from "react";

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "wheel",
  "visibilitychange",
] as const;

const LAST_ACTIVITY_KEY = "rec:lastActivity";

/** Record "now" as the last activity time (call on login). */
export function markActivityNow(): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

/** Forget the stored activity time (call on explicit logout). */
export function clearActivity(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
}

interface UseIdleLogoutOptions {
  /** Whether the idle timer should be active (typically: user is logged in). */
  enabled: boolean;
  /** Idle duration in milliseconds before onIdle fires. */
  timeoutMs: number;
  /** Called once when the user has been idle for `timeoutMs`. */
  onIdle: () => void;
}

/**
 * Logs the user out after a period of inactivity.
 *
 * Activity is any mouse/keyboard/touch/scroll event or the tab becoming
 * visible again. The last-activity timestamp is mirrored to localStorage so
 * the idle clock survives page reloads and is shared across tabs — reopening
 * the app after the timeout will still trigger a logout.
 */
export function useIdleLogout({
  enabled,
  timeoutMs,
  onIdle,
}: UseIdleLogoutOptions) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  const firedRef = useRef(false);

  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    firedRef.current = false;

    const clearTimer = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const fireIdle = () => {
      if (firedRef.current) return;
      firedRef.current = true;
      clearTimer();
      onIdleRef.current();
    };

    const readLastActivity = (): number | null => {
      const raw = window.localStorage.getItem(LAST_ACTIVITY_KEY);
      const parsed = raw ? Number(raw) : NaN;
      return Number.isFinite(parsed) ? parsed : null;
    };

    const scheduleFromLastActivity = () => {
      clearTimer();
      const last = readLastActivity() ?? Date.now();
      const remaining = timeoutMs - (Date.now() - last);
      if (remaining <= 0) {
        fireIdle();
        return;
      }
      timerRef.current = setTimeout(fireIdle, remaining);
    };

    // Throttle activity handling so we don't touch localStorage on every pixel.
    let lastWrite = 0;
    const handleActivity = () => {
      if (firedRef.current) return;
      // Ignore the visibilitychange event when the tab is being hidden.
      if (document.visibilityState === "hidden") return;

      const now = Date.now();
      if (now - lastWrite > 1000) {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        lastWrite = now;
      }
      scheduleFromLastActivity();
    };

    // On mount/enable, honor any PREVIOUS activity timestamp so the idle clock
    // survives full browser closes. If the user has already been idle past the
    // timeout (e.g. reopened the app a day later), log out immediately instead
    // of resetting the timer. Only seed a fresh timestamp when none exists.
    const previous = readLastActivity();
    if (previous !== null && Date.now() - previous >= timeoutMs) {
      fireIdle();
      return () => {
        clearTimer();
      };
    }
    if (previous === null) {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    }
    scheduleFromLastActivity();

    for (const evt of ACTIVITY_EVENTS) {
      window.addEventListener(evt, handleActivity, { passive: true });
    }

    return () => {
      clearTimer();
      for (const evt of ACTIVITY_EVENTS) {
        window.removeEventListener(evt, handleActivity);
      }
    };
  }, [enabled, timeoutMs]);
}
