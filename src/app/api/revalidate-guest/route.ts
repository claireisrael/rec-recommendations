import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Called after admin creates/updates/deletes so the guest portal
 * reflects Appwrite changes immediately (no stale ISR page).
 */
export async function POST() {
  revalidatePath("/guest");
  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
