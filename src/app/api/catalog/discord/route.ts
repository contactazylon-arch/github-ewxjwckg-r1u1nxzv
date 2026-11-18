import { NextRequest, NextResponse } from "next/server";
import {
  DiscordDirectoryError,
  fetchDiscordDirectoryBots,
  fetchDiscordDirectoryCategories,
} from "@/lib/catalog/sources/discord-directory";

export const runtime = "edge";
export const revalidate = 900;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = (params.get("locale") ?? "fr").slice(0, 10);

  try {
    if (params.get("categories") === "1") {
      const categories = await fetchDiscordDirectoryCategories(locale);
      return NextResponse.json(
        {
          categories,
          source: "discord-app-directory",
          experimental: true,
          updatedAt: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
          },
        },
      );
    }

    const page = Math.max(1, Math.min(1000, Number(params.get("page")) || 1));
    const pageSize = Math.max(1, Math.min(100, Number(params.get("limit")) || 50));
    const query = (params.get("search") ?? "").trim().slice(0, 100);
    const rawCategoryId = params.get("categoryId");
    const categoryId = rawCategoryId && /^\d+$/.test(rawCategoryId)
      ? Number(rawCategoryId)
      : undefined;

    const result = await fetchDiscordDirectoryBots({
      page,
      pageSize,
      query,
      categoryId,
      locale,
    });

    return NextResponse.json(
      {
        bots: result.bots,
        pagination: {
          page: result.page,
          limit: result.pageSize,
          pages: result.pages,
          totalDirectoryResults: result.totalDirectoryResults,
          returned: result.bots.length,
        },
        source: "discord-app-directory",
        experimental: true,
        coverage: "paginated-search-results; not a guaranteed full catalogue export",
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=900, stale-while-revalidate=1800",
        },
      },
    );
  } catch (error) {
    console.error("[BotNexus catalog] Discord App Directory request failed:", error);
    const status = error instanceof DiscordDirectoryError && error.status === 429
      ? 503
      : error instanceof DiscordDirectoryError && error.status && error.status >= 400 && error.status < 500
        ? 502
        : 503;
    return NextResponse.json(
      {
        error: "discord_directory_unavailable",
        source: "discord-app-directory",
        diagnostic: error instanceof DiscordDirectoryError ? error.message : "DISCORD_DIRECTORY_UNKNOWN_ERROR",
        ...(error instanceof DiscordDirectoryError && error.status ? { upstreamStatus: error.status } : {}),
        experimental: true,
      },
      {
        status,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
