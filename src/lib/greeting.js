function capitalizeWord(value) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function getFirstName(user) {
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
