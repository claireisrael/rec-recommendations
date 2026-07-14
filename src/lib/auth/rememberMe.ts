const REMEMBER_KEY = "nrep_remember_me";
const EMAIL_KEY = "nrep_remember_email";

export function isRememberMeEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(REMEMBER_KEY) === "true";
}

export function getRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  if (!isRememberMeEnabled()) return "";
  return localStorage.getItem(EMAIL_KEY) ?? "";
}

export function saveRememberMe(email: string, remember: boolean): void {
  if (typeof window === "undefined") return;
  if (remember) {
    localStorage.setItem(REMEMBER_KEY, "true");
    localStorage.setItem(EMAIL_KEY, email);
  } else {
    localStorage.removeItem(REMEMBER_KEY);
    localStorage.removeItem(EMAIL_KEY);
  }
}
