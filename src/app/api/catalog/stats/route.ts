import { NextResponse } from "next/server";
import { fetchTopbotBots } from "@/lib/catalog/sources/topbot";
import { fetchDiscordDirectoryBots } from "@/lib/catalog/sources/discord-directory";

export const runtime = "edge";
export const revalidate = 300;

export async function GET() {
  const [topbotResult, discordResult] = await Promise.allSettled([
    fetchTopbotBots({ page: 1, limit: 1, sort: "votes_month" }),
    fetchDiscordDirectoryBots({ page: 1, pageSize: 1, locale: "fr" }),
  ]);

  const topbot = topbotResult.status === "fulfilled"
    ? { available: true, total: topbotResult.value.total }
    : { available: false, total: null };

  const discord = discordResult.status === "fulfilled"
    ? {
        available: true,
        directoryEntries: discordResult.value.totalDirectoryResults,
        coverage: "category-search-count; not a guaranteed count of unique bots",
      }
    : { available: false, directoryEntries: null, coverage: null };

  return NextResponse.json(
    { topbot, discord, updatedAt: new Date().toISOString() },
    {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    },
  );
}
