import { NextRequest, NextResponse } from "next/server";
import { env } from "cloudflare:workers";

export const runtime = "edge";

const MODEL = "@cf/meta/m2m100-1.2b";
const MAX_TEXT_LENGTH = 1800;
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 30;

type CloudflareEnv = {
  AI: {
    run: (model: string, input: {
      text: string;
      source_lang: string;
      target_lang: string;
    }) => Promise<unknown>;
  };
  VINEXT_KV_CACHE: {
    get: (key: string, type: "text") => Promise<string | null>;
    put: (key: string, value: string, options?: { expirationTtl?: number }) => Promise<void>;
  };
};

function extractTranslation(result: unknown): string | null {
  if (!result || typeof result !== "object") return null;
  const data = result as Record<string, unknown>;
  for (const key of ["translated_text", "translation", "text"]) {
    if (typeof data[key] === "string" && data[key].trim()) {
      return data[key].trim();
    }
  }
  return null;
}

async function cacheKey(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text.trim());
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hash = Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return `botnexus:translation:v1:en-fr:${hash}`;
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const text = body && typeof body === "object"
    ? (body as Record<string, unknown>).text
    : null;

  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "text_required" }, { status: 400 });
  }

  const sourceText = text.trim();
  if (sourceText.length > MAX_TEXT_LENGTH) {
    return NextResponse.json(
      { error: "text_too_long", maxLength: MAX_TEXT_LENGTH },
      { status: 413 },
    );
  }

  const bindings = env as unknown as CloudflareEnv;
  if (!bindings.AI || !bindings.VINEXT_KV_CACHE) {
    return NextResponse.json({ error: "translation_service_unavailable" }, { status: 503 });
  }

  try {
    const key = await cacheKey(sourceText);
    const cached = await bindings.VINEXT_KV_CACHE.get(key, "text");
    if (cached) {
      return NextResponse.json({ translatedText: cached, cached: true });
    }

    const result = await bindings.AI.run(MODEL, {
      text: sourceText,
      source_lang: "english",
      target_lang: "french",
    });
    const translatedText = extractTranslation(result);

    if (!translatedText) {
      console.error("[BotNexus translation] Unexpected Workers AI response.");
      return NextResponse.json({ error: "translation_failed" }, { status: 502 });
    }

    await bindings.VINEXT_KV_CACHE.put(key, translatedText, {
      expirationTtl: CACHE_TTL_SECONDS,
    });

    return NextResponse.json({ translatedText, cached: false });
  } catch (error) {
    console.error("[BotNexus translation] Workers AI request failed:", error);
    return NextResponse.json(
      { error: "translation_temporarily_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
