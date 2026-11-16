import type { CatalogBot } from "./types";

type UnknownRecord = Record<string, unknown>;

const record = (value: unknown): UnknownRecord =>
  value && typeof value === "object" ? value as UnknownRecord : {};

const text = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const numberOrNull = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const localizedText = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  const item = record(value);
  const fallback = Object.values(item).find((value): value is string => typeof value === "string");
  return text(item.fr) ?? text(item.en) ?? text(item.default) ?? fallback ?? "";
};

const stringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === "string").map(v => v.trim()).filter(Boolean) : [];

const safeUrl = (value: unknown): string | null => {
  const raw = text(value);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
};

export function normalizeTopbotBot(input: unknown): CatalogBot | null {
  const bot = record(input);
  const id = text(bot.id) ?? text(bot.botId) ?? text(bot.applicationId);
  const name = text(bot.name);
  if (!id || !name) return null;

  return {
    id,
    name,
    description: localizedText(bot.shortDescription) || text(bot.description) || "",
    iconUrl: safeUrl(bot.iconUrl),
    bannerUrl: safeUrl(bot.bannerUrl),
    inviteUrl: safeUrl(bot.inviteUrl),
    websiteUrl: safeUrl(bot.websiteUrl),
    categories: stringArray(bot.categories),
    tags: stringArray(bot.tags),
    serverCount: numberOrNull(bot.serverCount),
    votesTotal: numberOrNull(bot.votesTotal),
    votesMonth: numberOrNull(bot.votesMonth),
    rating: numberOrNull(bot.rating) ?? numberOrNull(record(bot.rating).average),
    verified: bot.isVerified === true,
    verificationSource: bot.isVerified === true ? "topbot.gg" : null,
    publishedAt: text(bot.publishedAt),
    sources: ["topbot.gg"],
  };
}
