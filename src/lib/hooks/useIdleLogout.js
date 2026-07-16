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
];

const LAST_ACTIVITY_KEY = "rec:lastActivity";

export function markActivityNow() {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function clearActivity() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(LAST_ACTIVITY_KEY);
}

/**
 * @param {{ enabled: boolean, timeoutMs: number, onIdle: () => void }} options
 */
export function useIdleLogout({ enabled, timeoutMs, onIdle }) {
  const timerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null));
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

    const readLastActivity = () => {
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

    let lastWrite = 0;
    const handleActivity = () => {
      if (firedRef.current) return;
      if (document.visibilityState === "hidden") return;

      const now = Date.now();
      if (now - lastWrite > 1000) {
        window.localStorage.setItem(LAST_ACTIVITY_KEY, String(now));
        lastWrite = now;
      }
      scheduleFromLastActivity();
    };

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
