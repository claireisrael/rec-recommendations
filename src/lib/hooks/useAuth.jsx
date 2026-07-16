"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  login as authLogin,
  logout as authLogout,
  getCurrentUser,
} from "@/lib/appwrite/auth";
import {
  useIdleLogout,
  markActivityNow,
  clearActivity,
} from "@/lib/hooks/useIdleLogout";
import { toast } from "sonner";

const IDLE_TIMEOUT_MS = 20 * 60 * 1000;

/** @type {import("react").Context<null | { user: import("appwrite").Models.User<import("appwrite").Models.Preferences> | null, loading: boolean, login: (email: string, password: string) => Promise<void>, logout: () => Promise<void>, checkAuth: () => Promise<boolean> }>} */
const AuthContext = createContext(null);

/**
 * @param {{ children: import("react").ReactNode }} props
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const currentUser = await getCurrentUser();
    setUser(currentUser);
    return currentUser !== null;
  }, []);

  useEffect(() => {
    let active = true;
    checkAuth().finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [checkAuth]);

  const login = async (email, password) => {
    await authLogin(email, password);
    const currentUser = await getCurrentUser();
    markActivityNow();
    setUser(currentUser);
  };

  const logout = useCallback(async () => {
    await authLogout();
    clearActivity();
    setUser(null);
  }, []);

  const handleIdle = useCallback(async () => {
    try {
      await logout();
    } finally {
      toast.info("You were signed out after 20 minutes of inactivity.");
    }
  }, [logout]);

  useIdleLogout({
    enabled: user !== null,
    timeoutMs: IDLE_TIMEOUT_MS,
    onIdle: handleIdle,
  });

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, checkAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
