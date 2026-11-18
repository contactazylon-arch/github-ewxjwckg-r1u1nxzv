import { NextRequest, NextResponse } from "next/server";
import { decryptSession, getDiscordConfig, isDiscordAdmin, sessionCookieName } from "@/lib/auth/discord";

export const runtime = "edge";

type DiscordGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

export async function GET(request: NextRequest) {
  const cookie = request.cookies.get(sessionCookieName())?.value;
  if (!cookie) return NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });

  try {
    const config = getDiscordConfig();
    const session = await decryptSession(cookie, config.sessionKey);
    if (!session || session.expiresAt <= Date.now()) {
      const response = NextResponse.json({ authenticated: false }, { headers: { "Cache-Control": "no-store" } });
      response.cookies.delete(sessionCookieName());
      return response;
    }

    const guildResponse = await fetch("https://discord.com/api/users/@me/guilds?limit=200", {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    if (!guildResponse.ok) {
      console.error("[BotNexus OAuth] Guild list request failed:", guildResponse.status);
      return NextResponse.json({ authenticated: true, isAdmin: isDiscordAdmin(session.user.id), user: session.user, guilds: [], guildsUnavailable: true }, { headers: { "Cache-Control": "no-store" } });
    }

    const payload = await guildResponse.json() as DiscordGuild[];
    const guilds = Array.isArray(payload) ? payload.map((guild) => ({
      id: guild.id,
      name: guild.name,
      icon: guild.icon,
      owner: guild.owner,
      permissions: guild.permissions,
    })) : [];

    return NextResponse.json({ authenticated: true, isAdmin: isDiscordAdmin(session.user.id), user: session.user, guilds }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[BotNexus OAuth] Session lookup failed:", error);
    return NextResponse.json({ error: "session_unavailable" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
