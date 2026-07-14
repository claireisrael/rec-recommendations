import { getAccount } from "./client";
import type { Models } from "appwrite";

export async function login(
  email: string,
  password: string
): Promise<Models.Session> {
  return getAccount().createEmailPasswordSession(email, password);
}

export async function logout(): Promise<void> {
  // Deleting the current session can fail if it's already gone (e.g. expired
  // or the user is already a guest). That's fine — the end result is the same:
  // no active session. Swallow the error so logout never crashes the UI.
  try {
    await getAccount().deleteSession("current");
  } catch {
    // already signed out — ignore
  }
}

export async function getCurrentUser(): Promise<Models.User<Models.Preferences> | null> {
  try {
    return await getAccount().get();
  } catch {
    return null;
  }
}
