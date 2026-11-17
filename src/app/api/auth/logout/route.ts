import { NextRequest, NextResponse } from "next/server";
import { sessionCookieName } from "@/lib/auth/discord";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(sessionCookieName(), "", {
    httpOnly: true,
    secure: new URL(request.url).protocol === "https:",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}
