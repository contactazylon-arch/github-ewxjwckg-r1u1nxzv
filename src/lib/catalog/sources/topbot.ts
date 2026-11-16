import { normalizeTopbotBot } from "../normalize";
import type { CatalogBot } from "../types";

const TOPBOT_API = "https://topbot.gg/api/v1/bots";

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
  const url = new URL(TOPBOT_API);
  url.searchParams.set("page", String(options.page));
  url.searchParams.set("limit", String(options.limit));
  if (options.search) url.searchParams.set("search", options.search.slice(0, 100));
  if (options.sort) url.searchParams.set("sort", options.sort);

  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");
    throw new Error(response.status === 429
      ? `TOPBOT_RATE_LIMIT:${retryAfter ?? "60"}`
      : `TOPBOT_HTTP_${response.status}`);
  }

  const payload: unknown = await response.json();
  const root = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const pagination = root.pagination && typeof root.pagination === "object"
    ? root.pagination as Record<string, unknown>
    : {};
  const rawBots = Array.isArray(root.data) ? root.data : [];

  return {
    bots: rawBots.map(normalizeTopbotBot).filter((bot): bot is CatalogBot => bot !== null),
    page: typeof pagination.page === "number" ? pagination.page : options.page,
    limit: typeof pagination.limit === "number" ? pagination.limit : options.limit,
    total: typeof pagination.total === "number" ? pagination.total : rawBots.length,
    pages: typeof pagination.pages === "number" ? pagination.pages : 1,
  };
}
