import type { Models } from "appwrite";

function capitalizeWord(value: string): string {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function getFirstName(
  user: Pick<Models.User<Models.Preferences>, "name" | "email"> | null
): string {
  if (!user) return "there";

  const fromName = user.name?.trim().split(/\s+/)[0];
  if (fromName) return capitalizeWord(fromName);

  const emailLocal = user.email?.split("@")[0]?.trim();
  if (emailLocal) {
    const segment = emailLocal.split(/[._-]/)[0]?.replace(/\d+$/, "");
    if (segment) return capitalizeWord(segment);
    return capitalizeWord(emailLocal);
  }

  return "there";
}
