import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/** Called after admin writes so the guest portal reflects Appwrite changes. */
export async function POST() {
  revalidatePath("/guest");
  revalidatePath("/");
  return NextResponse.json({ revalidated: true, now: Date.now() });
}
