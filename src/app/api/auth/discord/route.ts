import { NextRequest, NextResponse } from "next/server";
import { createRandomState, getDiscordConfig, secureCookie, stateCookieName } from "@/lib/auth/discord";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const config = getDiscordConfig();
    const state = createRandomState();
    const authorizeUrl = new URL("https://discord.com/oauth2/authorize");
    authorizeUrl.searchParams.set("client_id", config.clientId);
    authorizeUrl.searchParams.set("redirect_uri", config.redirectUri);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("scope", "identify email guilds");
    authorizeUrl.searchParams.set("state", state);

    const response = NextResponse.redirect(authorizeUrl);
    response.cookies.set(stateCookieName(), state, {
      httpOnly: true,
      secure: secureCookie(request.url),
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[BotNexus OAuth] Start failed:", error);
    return NextResponse.json({ error: "discord_auth_not_configured" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
