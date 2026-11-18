import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { fetchTopbotBots } from "@/lib/catalog/sources/topbot";
import { fetchDiscordDirectoryBots } from "@/lib/catalog/sources/discord-directory";

export const runtime = "edge";
export const revalidate = 300;

type ActivityKV = {
  list: (options: { prefix: string; limit?: number; cursor?: string }) => Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
  get: (key: string, type: "text") => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

function utcDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

async function readActivity(kv: ActivityKV) {
  const days: { date: string; count: number }[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = utcDate(offset);
    let count = 0;
    let cursor: string | undefined;
    let pages = 0;
    do {
      const result = await kv.list({
        prefix: `botnexus:activity:v1:${date}:`,
        limit: 1000,
        ...(cursor ? { cursor } : {}),
      });
      count += result.keys.length;
      cursor = result.list_complete ? undefined : result.cursor;
      pages += 1;
    } while (cursor && pages < 5);
    days.push({ date, count });
  }
  return { available: true, days, total: days.reduce((sum, day) => sum + day.count, 0) };
}

async function checkKV(kv: ActivityKV): Promise<boolean> {
  const key = `botnexus:health:dashboard:${crypto.randomUUID()}`;
  try {
    await kv.put(key, "ok", { expirationTtl: 60 });
    return (await kv.get(key, "text")) === "ok";
  } catch {
    return false;
  } finally {
    try { await kv.delete(key); } catch { /* TTL cleans up if deletion fails */ }
  }
}

export async function GET() {
  const bindings = env as unknown as { VINEXT_KV_CACHE?: ActivityKV };
  const kv = bindings.VINEXT_KV_CACHE;
  const [topbotResult, discordResult, kvAvailable] = await Promise.all([
    fetchTopbotBots({ page: 1, limit: 1, sort: "votes_month" }).then(value => ({ status: "fulfilled" as const, value })).catch(reason => ({ status: "rejected" as const, reason })),
    fetchDiscordDirectoryBots({ page: 1, pageSize: 1, locale: "fr" }).then(value => ({ status: "fulfilled" as const, value })).catch(reason => ({ status: "rejected" as const, reason })),
    kv ? checkKV(kv) : Promise.resolve(false),
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

  let activity = { available: false, days: [] as { date: string; count: number }[], total: 0 };
  if (kvAvailable && kv) {
    try {
      activity = await readActivity(kv);
    } catch (error) {
      console.error("[BotNexus activity] KV read failed:", error);
    }
  }

  const availableServices = Number(topbot.available) + Number(discord.available) + Number(kvAvailable);
  return NextResponse.json(
    {
      topbot,
      discord,
      monitoring: { available: kvAvailable, availableServices, totalServices: 3 },
      activity,
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
