import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";
import { decryptSession, getDiscordConfig, sessionCookieName } from "@/lib/auth/discord";

export const runtime = "edge";

type ActivityKV = {
  put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
};

const visitorPages = new Set(["overview", "discover", "servers", "studio", "alerts", "settings"]);
const allowedInteractions = new Set([
  "page_overview",
  "page_discover",
  "page_servers",
  "page_studio",
  "page_alerts",
  "page_settings",
  "bot_detail",
  "catalog_search",
  "bot_invite_click",
  "bot_website_click",
]);

async function anonymizedAccountId(id: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(id));
  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null) as { type?: unknown; page?: unknown; event?: unknown } | null;
    if (!body || typeof body !== "object") {
      return NextResponse.json({ recorded: false, reason: "invalid_payload" }, { status: 400 });
    }

    const bindings = env as unknown as { VINEXT_KV_CACHE?: ActivityKV };
    const kv = bindings.VINEXT_KV_CACHE;
    if (!kv) return NextResponse.json({ error: "activity_storage_unavailable" }, { status: 503 });

    const date = new Date().toISOString().slice(0, 10);
    if (body.type === "visit") {
      const page = typeof body.page === "string" ? body.page : "";
      if (!visitorPages.has(page)) {
        return NextResponse.json({ recorded: false, reason: "invalid_page" }, { status: 400 });
      }
      // Page views are counted without cookies, IP addresses, device fingerprints or visitor identifiers.
      const key = `botnexus:activity:v2:${date}:visits:${page}:${crypto.randomUUID()}`;
      await kv.put(key, "1", { expirationTtl: 60 * 60 * 24 * 30 });
      return NextResponse.json({ recorded: true, type: "visit" }, { headers: { "Cache-Control": "no-store" } });
    }

    const event = typeof body.event === "string" ? body.event : "";
    if (body.type !== "interaction" || !allowedInteractions.has(event)) {
      return NextResponse.json({ error: "invalid_event" }, { status: 400 });
    }

    const cookie = request.cookies.get(sessionCookieName())?.value;
    if (!cookie) return NextResponse.json({ recorded: false, reason: "authentication_required" }, { status: 401 });

    const config = getDiscordConfig();
    const session = await decryptSession(cookie, config.sessionKey);
    if (!session || session.expiresAt <= Date.now()) {
      return NextResponse.json({ recorded: false, reason: "session_expired" }, { status: 401 });
    }

    const account = await anonymizedAccountId(session.user.id);
    const key = `botnexus:activity:v2:${date}:interactions:${event}:${account}`;
    await kv.put(key, "1", { expirationTtl: 60 * 60 * 24 * 30 });
    return NextResponse.json({ recorded: true, type: "interaction" }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[BotNexus activity] Event recording failed:", error);
    return NextResponse.json({ error: "activity_recording_failed" }, { status: 503 });
  }
}
