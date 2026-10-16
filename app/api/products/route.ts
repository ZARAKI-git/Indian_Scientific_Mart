import { NextResponse, type NextRequest } from "next/server";
import { parseQuery } from "@/lib/catalogue/params";
import { productRepo } from "@/lib/repositories";

/** Paged catalogue search for the client list (infinite load). Same parser as the pages. */
export async function GET(req: NextRequest) {
  const q = parseQuery(req.nextUrl.searchParams);
  try {
    const page = await productRepo().search(q);
    return NextResponse.json(page, { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600" } });
  } catch (e) {
    console.error("[api/products]", e);
    return NextResponse.json({ error: "search failed" }, { status: 500 });
  }
}
