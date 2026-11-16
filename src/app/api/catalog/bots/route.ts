import { NextRequest, NextResponse } from "next/server";
import { deduplicateBots } from "@/lib/catalog/dedupe";
import { fetchTopbotBots, TopbotApiError } from "@/lib/catalog/sources/topbot";

export const runtime = "edge";
export const revalidate = 300;

const allowedSorts = new Set(["votes_month", "votes_total", "servers", "new", "name"]);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Math.min(10_000, Number(params.get("page")) || 1));
  const limit = Math.max(1, Math.min(100, Number(params.get("limit")) || 50));
  const search = (params.get("search") ?? "").trim().slice(0, 100);
  const requestedSort = params.get("sort") ?? "votes_month";
  const sort = allowedSorts.has(requestedSort) ? requestedSort : "votes_month";

  try {
    const result = await fetchTopbotBots({ page, limit, search, sort });
    const bots = deduplicateBots(result.bots);
    return NextResponse.json({
      bots,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
        returned: bots.length,
      },
      source: "topbot.gg",
      updatedAt: new Date().toISOString(),
    }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (error) {
    // Keep upstream details in server logs so a 502 can be diagnosed without
    // exposing provider responses or internal errors to visitors.
    console.error("[BotNexus catalog] Topbot request failed:", error);
    const message = error instanceof Error ? error.message : "CATALOG_UNAVAILABLE";
    const rateLimited = message.startsWith("TOPBOT_RATE_LIMIT:");
    const retryAfter = rateLimited ? message.split(":")[1] : null;
    const upstreamStatus = error instanceof TopbotApiError ? error.status : null;
    const diagnostic = upstreamStatus !== null
      ? "upstream_http_error"
      : message === "TOPBOT_INVALID_JSON"
        ? "upstream_invalid_json"
        : message === "TimeoutError" || message.includes("timed out")
          ? "upstream_timeout"
          : "upstream_network_error";

    return NextResponse.json(
      {
        error: rateLimited ? "source_rate_limited" : "catalog_unavailable",
        source: "topbot.gg",
        diagnostic,
        ...(upstreamStatus !== null ? { upstreamStatus } : {}),
      },
      {
        status: rateLimited ? 503 : 502,
        headers: retryAfter ? { "Retry-After": retryAfter } : undefined,
      },
    );
  }
}
