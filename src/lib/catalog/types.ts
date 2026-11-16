export type BotCategory = string;

export interface CatalogBot {
  id: string;
  name: string;
  description: string;
  iconUrl: string | null;
  bannerUrl: string | null;
  inviteUrl: string | null;
  websiteUrl: string | null;
  categories: BotCategory[];
  tags: string[];
  serverCount: number | null;
  votesTotal: number | null;
  votesMonth: number | null;
  rating: number | null;
  verified: boolean;
  verificationSource: string | null;
  publishedAt: string | null;
  sources: string[];
}

export interface CatalogPage {
  bots: CatalogBot[];
  page: number;
  limit: number;
  total: number;
  pages: number;
  source: string;
  updatedAt: string;
}
