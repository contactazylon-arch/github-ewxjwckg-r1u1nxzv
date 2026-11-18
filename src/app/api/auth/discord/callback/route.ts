import { NextRequest, NextResponse } from "next/server";
import {
  encryptSession,
  getDiscordConfig,
  secureCookie,
  sessionCookieName,
  sessionMaxAge,
  stateCookieName,
  type DiscordSession,
} from "@/lib/auth/discord";

export const runtime = "edge";

type DiscordTokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
  error?: string;
};

type DiscordUser = {
  id?: string;
  username?: string;
  global_name?: string | null;
  avatar?: string | null;
  email?: string | null;
  verified?: boolean;
};

function authError(request: NextRequest, reason: string) {
  const url = new URL("/", request.url);
  url.searchParams.set("auth", "discord_error");
  url.searchParams.set("reason", reason);
  const response = NextResponse.redirect(url);
  response.cookies.delete(stateCookieName());
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const returnedState = request.nextUrl.searchParams.get("state");
  const savedState = request.cookies.get(stateCookieName())?.value;

  if (!code || !returnedState || !savedState || returnedState !== savedState) {
    return authError(request, "invalid_state");
  }

  try {
    const config = getDiscordConfig();
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: config.clientId,
        client_secret: config.clientSecret,
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
      }),
    });
    const token = await tokenResponse.json() as DiscordTokenResponse;
    if (!tokenResponse.ok || !token.access_token) {
      console.error("[BotNexus OAuth] Token exchange failed:", token.error ?? tokenResponse.status);
      return authError(request, "token_exchange_failed");
    }

    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const user = await userResponse.json() as DiscordUser;
    if (!userResponse.ok || !user.id || !user.username) {
      console.error("[BotNexus OAuth] User profile request failed:", userResponse.status);
      return authError(request, "profile_fetch_failed");
    }

    const session: DiscordSession = {
      accessToken: token.access_token,
      expiresAt: Date.now() + Math.max(60, token.expires_in ?? 3600) * 1000,
      user: {
        id: user.id,
        username: user.username,
        globalName: user.global_name ?? null,
        avatar: user.avatar ?? null,
        email: user.email ?? null,
        verified: user.verified === true,
      },
    };

    const encrypted = await encryptSession(session, config.sessionKey);
    const response = NextResponse.redirect(new URL("/", request.url));
    response.cookies.set(sessionCookieName(), encrypted, {
      httpOnly: true,
      secure: secureCookie(request.url),
      sameSite: "lax",
      path: "/",
      maxAge: Math.min(sessionMaxAge(), Math.max(60, token.expires_in ?? 3600)),
    });
    response.cookies.delete(stateCookieName());
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    console.error("[BotNexus OAuth] Callback failed:", error);
    return authError(request, "callback_failed");
  }
}
