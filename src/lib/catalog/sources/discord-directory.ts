import type { CatalogBot } from "../types";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord =>
  value && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : {};

const asText = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map(item => item.trim()).filter(Boolean)
    : [];

function safeHttpUrl(value: unknown): string | null {
  const raw = asText(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function firstExternalUrl(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    const record = asRecord(item);
    const url = safeHttpUrl(record.url);
    if (url) return url;
  }
  return null;
}

/**
 * Discord's public App Directory contains applications as well as bots.
 * Only records with an attached bot user are included in BotNexus' bot catalogue.
 */
export function normalizeDiscordDirectoryEntry(input: unknown): CatalogBot | null {
  const entry = asRecord(input);
  const application = asRecord(entry.data ?? entry.application ?? entry);
  const bot = asRecord(application.bot);
  const id = asText(application.id);
  const name = asText(application.name);

  if (!id || !name || !Object.keys(bot).length) return null;

  const directoryEntry = asRecord(
    application.directory_entry ?? application.application_directory_entry ?? entry.directory_entry,
  );
  const description =
    asText(directoryEntry.short_description) ??
    asText(directoryEntry.detailed_description) ??
    asText(application.description) ??
    "";

  const iconHash = asText(application.icon);
  const iconUrl = iconHash
    ? `https://cdn.discordapp.com/app-icons/${encodeURIComponent(id)}/${encodeURIComponent(iconHash)}.png?size=256`
    : null;

  const customInstallUrl = safeHttpUrl(application.custom_install_url);
  const inviteUrl = customInstallUrl ??
    `https://discord.com/oauth2/authorize?client_id=${encodeURIComponent(id)}`;

  const serverCountValue = application.bot_approximate_guild_count ?? application.approximate_guild_count;
  const serverCount = typeof serverCountValue === "number" && Number.isFinite(serverCountValue)
    ? serverCountValue
    : null;

  return {
    id,
    name,
    description,
    iconUrl,
    bannerUrl: null,
    inviteUrl,
    websiteUrl: firstExternalUrl(directoryEntry.external_urls) ?? safeHttpUrl(application.website),
    categories: asStringArray(application.tags),
    tags: asStringArray(application.tags),
    serverCount,
    votesTotal: null,
    votesMonth: null,
    rating: null,
    verified: application.is_verified === true,
    verificationSource: application.is_verified === true ? "discord" : null,
    publishedAt: null,
    sources: ["discord-app-directory"],
  };
}

export type DiscordDirectoryPage = {
  bots: CatalogBot[];
  page: number;
  pageSize: number;
  pages: number;
  totalDirectoryResults: number | null;
};

export class DiscordDirectoryError extends Error {
  constructor(message: string, public readonly status: number | null = null) {
    super(message);
    this.name = "DiscordDirectoryError";
  }
}

function extractSearchResults(payload: unknown): UnknownRecord {
  const root = asRecord(payload);
  const results = asRecord(root.results);
  const rawEntries = Array.isArray(root.results)
    ? root.results
    : Array.isArray(results.items)
      ? results.items
      : Array.isArray(results.results)
        ? results.results
        : Array.isArray(results.data)
          ? results.data
          : null;

  if (!rawEntries) throw new DiscordDirectoryError("DISCORD_DIRECTORY_INVALID_RESPONSE");
  const rawPages = root.num_pages ?? results.num_pages;
  const pages = typeof rawPages === "number" && Number.isFinite(rawPages)
    ? Math.max(1, Math.min(1000, Math.floor(rawPages)))
    : 1;

  const categoryCounts = asRecord(root.counts_by_category);
  const counts = Object.values(categoryCounts).filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value),
  );
  const totalDirectoryResults = counts.length
    ? counts.reduce((sum, value) => sum + value, 0)
    : null;

  return { rawEntries, pages, totalDirectoryResults };
}

async function discordJson(url: URL): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new DiscordDirectoryError(
      error instanceof Error && error.name === "TimeoutError"
        ? "DISCORD_DIRECTORY_TIMEOUT"
        : "DISCORD_DIRECTORY_NETWORK_ERROR",
    );
  }

  if (!response.ok) {
    throw new DiscordDirectoryError("DISCORD_DIRECTORY_UPSTREAM_ERROR", response.status);
  }

  try {
    return await response.json() as unknown;
  } catch {
    throw new DiscordDirectoryError("DISCORD_DIRECTORY_INVALID_JSON");
  }
}

export async function fetchDiscordDirectoryCategories(locale = "fr"): Promise<unknown[]> {
  const url = new URL("https://discord.com/api/v10/application-directory-static/categories");
  url.searchParams.set("locale", locale);
  const response = await discordJson(url);
  const payload = asRecord(response);
  const categories = Array.isArray(response)
    ? response
    : Array.isArray(payload.categories)
      ? payload.categories
      : null;
  if (!categories) throw new DiscordDirectoryError("DISCORD_DIRECTORY_INVALID_CATEGORIES");
  return categories;
}

export async function fetchDiscordDirectoryBots(options: {
  page: number;
  pageSize: number;
  query?: string;
  categoryId?: number;
  locale?: string;
}): Promise<DiscordDirectoryPage> {
  const url = new URL("https://discord.com/api/v10/application-directory-static/search");
  url.searchParams.set("page", String(options.page));
  url.searchParams.set("page_size", String(options.pageSize));
  url.searchParams.set("locale", options.locale ?? "fr");
  if (options.query?.trim()) url.searchParams.set("query", options.query.trim().slice(0, 100));
  if (options.categoryId !== undefined) url.searchParams.set("category_id", String(options.categoryId));

  const payload = await discordJson(url);
  const parsed = extractSearchResults(payload);
  const bots = (parsed.rawEntries as unknown[])
    .map(normalizeDiscordDirectoryEntry)
    .filter((bot): bot is CatalogBot => bot !== null);

  return {
    bots,
    page: options.page,
    pageSize: options.pageSize,
    pages: parsed.pages as number,
    totalDirectoryResults: parsed.totalDirectoryResults as number | null,
  };
}
