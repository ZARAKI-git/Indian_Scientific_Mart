import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { CATALOGUE_TAG } from "@/lib/supabase/server";

/** Called by the ingestion loader after a load: POST with header `x-revalidate-secret`. */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret || req.headers.get("x-revalidate-secret") !== secret) return NextResponse.json({ ok: false }, { status: 401 });
  revalidateTag(CATALOGUE_TAG);
  revalidatePath("/", "layout");
  return NextResponse.json({ ok: true });
}
