"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { getAccount } from "@/lib/appwrite/client";
import { listNotificationsForUser } from "@/lib/appwrite/notifications";
import { useAuth } from "@/lib/hooks/useAuth";

/**
 * Unread notification count for sidebar badge.
 * Includes all unread inbox items so the number stays visible
 * (reviews, assignments, etc.) — red badge signals notifications.
 */
export function usePendingReviewCount() {
  const { user } = useAuth();
  const pathname = usePathname();
  const [count, setCount] = useState(0);

  const refresh = useCallback(async () => {
    if (!user?.$id) {
      setCount(0);
      return;
    }
    try {
      const jwt = await getAccount().createJWT();
      const list = await listNotificationsForUser(jwt.jwt, user.$id);
      const unread = list.filter((n) => !n.read).length;
      setCount(unread);
    } catch {
      // Keep last known count on transient failures
    }
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh, pathname]);

  useEffect(() => {
    if (!user?.$id) return;
    const onFocus = () => void refresh();
    const onUpdated = () => void refresh();
    window.addEventListener("focus", onFocus);
    window.addEventListener("rec-notifications-updated", onUpdated);
    const id = window.setInterval(() => void refresh(), 60_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("rec-notifications-updated", onUpdated);
      window.clearInterval(id);
    };
  }, [user?.$id, refresh]);

  return count;
}
