import { getAccount } from "./client";

export async function login(email, password) {
  return getAccount().createEmailPasswordSession(email, password);
}

export async function logout() {
  try {
    await getAccount().deleteSession("current");
  } catch {
    // already signed out — ignore
  }
}

export async function getCurrentUser() {
  try {
    return await getAccount().get();
  } catch {
    return null;
  }
}
