import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { decryptSession, getDiscordConfig, sessionCookieName } from "@/lib/auth/discord";

export const runtime = "edge";

type ActivityKV = {
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
};

const allowedEvents = new Set([
  "page_overview",
  "page_discover",
  "page_servers",
  "page_studio",
  "page_alerts",
  "page_settings",
  "bot_detail",
  "catalog_search",
]);

async function anonymizedAccountId(id: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  const cookie = request.cookies.get(sessionCookieName())?.value;
  if (!cookie) return NextResponse.json({ recorded: false, reason: "authentication_required" }, { status: 401 });

  try {
    const config = getDiscordConfig();
    const session = await decryptSession(cookie, config.sessionKey);
    if (!session || session.expiresAt <= Date.now()) {
      return NextResponse.json({ recorded: false, reason: "session_expired" }, { status: 401 });
    }

    const body = await request.json().catch(() => null) as { event?: unknown } | null;
    const event = typeof body?.event === "string" ? body.event : "";
    if (!allowedEvents.has(event)) {
      return NextResponse.json({ error: "invalid_event" }, { status: 400 });
    }

    const bindings = env as unknown as { VINEXT_KV_CACHE?: ActivityKV };
    if (!bindings.VINEXT_KV_CACHE) {
      return NextResponse.json({ error: "activity_storage_unavailable" }, { status: 503 });
    }

    const date = new Date().toISOString().slice(0, 10);
    const account = await anonymizedAccountId(session.user.id);
    const key = `botnexus:activity:v1:${date}:${event}:${account}`;
    await bindings.VINEXT_KV_CACHE.put(key, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return NextResponse.json({ recorded: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[BotNexus activity] Event recording failed:", error);
    return NextResponse.json({ error: "activity_recording_failed" }, { status: 503 });
  }
}
