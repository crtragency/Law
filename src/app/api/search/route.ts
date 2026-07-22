import { NextResponse } from "next/server";
import { ensurePermission, AuthError } from "@/lib/auth";
import { runDashboardSearch } from "@/lib/dashboard-search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await ensurePermission("search.view");
    const url = new URL(request.url);
    const query = url.searchParams.get("q") ?? "";
    const results = await runDashboardSearch(query, {
      id: user.id,
      role: user.role,
      permissionOverridesJson: user.permissionOverridesJson,
    });
    return NextResponse.json(results);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    console.error("Search API failed:", error);
    return NextResponse.json({ error: "تعذّر تنفيذ البحث" }, { status: 500 });
  }
}
