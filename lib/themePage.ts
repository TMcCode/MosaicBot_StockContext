/**
 * Themes we statically generate under `/theme/[slug]`.
 * Matches `allThemeSlugs()` — needs research notes (`meta_url`) and not explicitly empty.
 */
export function themeHasPublishedPage(theme: {
  has_table_data?: boolean;
  meta_url?: string | null;
}): boolean {
  return theme.has_table_data !== false && Boolean(theme.meta_url);
}
