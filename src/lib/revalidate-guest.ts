/** Ask Next.js to refresh the guest portal after Appwrite writes. */
export async function revalidateGuestPortal(): Promise<void> {
  try {
    await fetch("/api/revalidate-guest", { method: "POST" });
  } catch {
    // Non-fatal — guest page is also force-dynamic.
  }
}
