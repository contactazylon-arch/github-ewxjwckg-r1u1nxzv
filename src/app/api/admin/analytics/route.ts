import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { decryptSession, getDiscordConfig, isDiscordAdmin, sessionCookieName } from "@/lib/auth/discord";

export const runtime = "edge";

type ActivityKV = {
  list: (options: { prefix: string; limit?: number; cursor?: string }) => Promise<{
    keys: { name: string }[];
    list_complete: boolean;
    cursor?: string;
  }>;
};

function utcDate(daysAgo: number): string {
  return new Date(Date.now() - daysAgo * 86_400_000).toISOString().slice(0, 10);
}

async function listKeys(kv: ActivityKV, prefix: string): Promise<string[]> {
  const names: string[] = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const result = await kv.list({ prefix, limit: 1000, ...(cursor ? { cursor } : {}) });
    names.push(...result.keys.map(key => key.name));
    cursor = result.list_complete ? undefined : result.cursor;
    pages += 1;
  } while (cursor && pages < 20);
  return names;
}

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(sessionCookieName())?.value;
  if (!cookie) return NextResponse.json({ error: "authentication_required" }, { status: 401, headers: { "Cache-Control": "no-store" } });

  try {
    const config = getDiscordConfig();
    const session = await decryptSession(cookie, config.sessionKey);
    if (!session || session.expiresAt <= Date.now()) {
      return NextResponse.json({ error: "session_expired" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }
    if (!isDiscordAdmin(session.user.id)) {
      return NextResponse.json({ error: "admin_required" }, { status: 403, headers: { "Cache-Control": "no-store" } });
    }

    const bindings = env as unknown as { VINEXT_KV_CACHE?: ActivityKV };
    const kv = bindings.VINEXT_KV_CACHE;
    if (!kv) return NextResponse.json({ error: "activity_storage_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });

    const days: { date: string; visits: number; interactions: number; activeAccounts: number; pages: Record<string, number> }[] = [];
    const eventTotals: Record<string, number> = {};
    const allActiveAccounts = new Set<string>();
    const last7ActiveAccounts = new Set<string>();
    for (let offset = 29; offset >= 0; offset -= 1) {
      const date = utcDate(offset);
      const [visitKeys, interactionKeys] = await Promise.all([
        listKeys(kv, `botnexus:activity:v2:${date}:visits:`),
        listKeys(kv, `botnexus:activity:v2:${date}:interactions:`),
      ]);
      const accounts = new Set<string>();
      const pages: Record<string, number> = {};
      for (const key of visitKeys) {
        const page = key.split(":")[5] ?? "unknown";
        pages[page] = (pages[page] ?? 0) + 1;
      }
      for (const key of interactionKeys) {
        const parts = key.split(":");
        const event = parts[5] ?? "unknown";
        const accountHash = parts[6] ?? "";
        if (accountHash) {
          accounts.add(accountHash);
          allActiveAccounts.add(accountHash);
          if (offset < 7) last7ActiveAccounts.add(accountHash);
        }
        eventTotals[event] = (eventTotals[event] ?? 0) + 1;
      }
      days.push({ date, visits: visitKeys.length, interactions: interactionKeys.length, activeAccounts: accounts.size, pages });
    }

    return NextResponse.json({
      available: true,
      days,
      totals: {
        visits: days.slice(-7).reduce((sum, day) => sum + day.visits, 0),
        interactions: days.slice(-7).reduce((sum, day) => sum + day.interactions, 0),
        activeAccounts: last7ActiveAccounts.size,
      },
      totals30: {
        visits: days.reduce((sum, day) => sum + day.visits, 0),
        interactions: days.reduce((sum, day) => sum + day.interactions, 0),
        activeAccounts: allActiveAccounts.size,
      },
      eventTotals,
      retentionDays: 30,
      updatedAt: new Date().toISOString(),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[BotNexus analytics] Admin analytics request failed:", error);
    return NextResponse.json({ error: "analytics_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
