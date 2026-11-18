import { NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { fetchTopbotBots } from "@/lib/catalog/sources/topbot";
import { fetchDiscordDirectoryBots } from "@/lib/catalog/sources/discord-directory";

export const runtime = "edge";
export const revalidate = 300;

type ActivityKV = {
  get: (key: string, type: "text") => Promise<string | null>;
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

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
    // Discord's directory endpoint is validated with a page size of 10 in the catalogue smoke test.
    // Keep the dashboard health check on that same supported request shape.
    fetchDiscordDirectoryBots({ page: 1, pageSize: 10, locale: "en" }).then(value => ({ status: "fulfilled" as const, value })).catch(reason => ({ status: "rejected" as const, reason })),
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

  const availableServices = Number(topbot.available) + Number(discord.available) + Number(kvAvailable);
  return NextResponse.json(
    {
      topbot,
      discord,
      monitoring: { available: kvAvailable, availableServices, totalServices: 3 },
      updatedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
