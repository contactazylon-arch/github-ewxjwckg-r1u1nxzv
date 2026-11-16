import { normalizeTopbotBot } from "../normalize";
import type { CatalogBot } from "../types";

const TOPBOT_API = "https://topbot.gg/api/v1/bots";

export class TopbotApiError extends Error {
  constructor(public readonly status: number) {
    super(`TOPBOT_HTTP_${status}`);
    this.name = "TopbotApiError";
  }
}

export interface TopbotResult {
  bots: CatalogBot[];
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export async function fetchTopbotBots(options: {
  page: number;
  limit: number;
  search?: string;
  sort?: string;
}): Promise<TopbotResult> {
  const searching = Boolean(options.search?.trim());
  const url = new URL(searching ? "https://topbot.gg/api/v1/search" : TOPBOT_API);
  if (searching) {
    url.searchParams.set("q", options.search!.trim().slice(0, 100));
    url.searchParams.set("limit", String(Math.min(options.limit, 50)));
    url.searchParams.set("lang", "en");
  } else {
    url.searchParams.set("page", String(options.page));
    url.searchParams.set("limit", String(options.limit));
    if (options.sort) url.searchParams.set("sort", options.sort);
  }

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(10_000),
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    if (response.status === 429) {
      const retryAfter = response.headers.get("retry-after") ?? "60";
      throw new Error(`TOPBOT_RATE_LIMIT:${retryAfter}`);
    }
    throw new TopbotApiError(response.status);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error("TOPBOT_INVALID_JSON");
  }
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const pagination = root.pagination && typeof root.pagination === "object"
    ? root.pagination as Record<string, unknown>
    : {};
  const rawBots = Array.isArray(root.data) ? root.data : [];
  const searchTotal = typeof root.total === "number" ? root.total : rawBots.length;

  return {
    bots: rawBots.map(normalizeTopbotBot).filter((bot): bot is CatalogBot => bot !== null),
    page: typeof pagination.page === "number" ? pagination.page : 1,
    limit: typeof pagination.limit === "number" ? pagination.limit : (searching ? Math.min(options.limit, 50) : options.limit),
    total: typeof pagination.total === "number" ? pagination.total : searchTotal,
    pages: typeof pagination.pages === "number" ? pagination.pages : 1,
  };
}
