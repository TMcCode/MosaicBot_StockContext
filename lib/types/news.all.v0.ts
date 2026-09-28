/** 90-day all-news feed published by MosaicBot (`news_radar/all_news_feed.py`). */

/** Filter fields for one story (index row). */
export type AllNewsItemV0 = {
  i: string;
  /** YYYY-MM-DD (article publish date, or first-seen when missing). */
  d: string;
  /** ISO week key of `d`, e.g. `2026-W39` — names the week file holding display fields. */
  w: string;
  th?: string[];
  tk?: string[];
  /** Full article text available to signed-in readers. */
  x?: 1;
};

/** Display fields for one story (week file). */
export type AllNewsDetailV0 = {
  t: string;
  s?: string | null;
  u: string;
  /** Snippet (≤ 300 chars). */
  n?: string;
};

export type AllNewsIndexV0 = {
  schema_version: "news.all.index.v0";
  as_of?: string;
  window_days: number;
  total: number;
  themes: Record<string, { n: string; g: string | null }>;
  groups: Record<string, { n: string; s: string | null }>;
  /** Newest first. */
  weeks: { w: string; n: number; h: string }[];
  /** Newest first. */
  items: AllNewsItemV0[];
};

export type AllNewsWeekV0 = {
  schema_version: "news.all.week.v0";
  week: string;
  items: Record<string, AllNewsDetailV0>;
};

export type AllNewsStory = AllNewsItemV0 & AllNewsDetailV0;

/** Newest headlines for the home crawler. */
export type AllNewsLatestV0 = {
  schema_version: "news.all.latest.v0";
  as_of?: string;
  items: { i: string; t: string; u: string }[];
};
