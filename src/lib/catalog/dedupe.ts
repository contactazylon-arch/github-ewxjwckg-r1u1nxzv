import type { CatalogBot } from "./types";

/**
 * One canonical listing per Discord application ID.
 * Name/domain similarities are deliberately not enough to merge records:
 * they can be reviewed later as possible duplicates without losing distinct bots.
 */
export function deduplicateBots(records: CatalogBot[]): CatalogBot[] {
  const byId = new Map<string, CatalogBot>();

  for (const incoming of records) {
    const key = incoming.id.trim();
    if (!key) continue;
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, incoming);
      continue;
    }

    const preferred = incoming.description.length > existing.description.length ? incoming : existing;
    const other = preferred === incoming ? existing : incoming;
    byId.set(key, {
      ...other,
      ...preferred,
      description: preferred.description || other.description,
      iconUrl: preferred.iconUrl ?? other.iconUrl,
      bannerUrl: preferred.bannerUrl ?? other.bannerUrl,
      inviteUrl: preferred.inviteUrl ?? other.inviteUrl,
      websiteUrl: preferred.websiteUrl ?? other.websiteUrl,
      categories: [...new Set([...existing.categories, ...incoming.categories])],
      tags: [...new Set([...existing.tags, ...incoming.tags])],
      sources: [...new Set([...existing.sources, ...incoming.sources])],
      verified: existing.verified || incoming.verified,
      verificationSource: existing.verificationSource ?? incoming.verificationSource,
      serverCount: incoming.serverCount ?? existing.serverCount,
      votesTotal: incoming.votesTotal ?? existing.votesTotal,
      votesMonth: incoming.votesMonth ?? existing.votesMonth,
      rating: incoming.rating ?? existing.rating,
    });
  }

  return [...byId.values()];
}
