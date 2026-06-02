/**
 * Paths for next/link. next.config `basePath` (from NEXT_PUBLIC_BASE_PATH at build)
 * is applied automatically by Next.js — do not prefix here or links become
 * /MosaicBot_StockContext/MosaicBot_StockContext/...
 */
export function href(path: string): string {
  if (!path || path === "/") return "/";
  const p = path.startsWith("/") ? path : `/${path}`;
  return p.endsWith("/") ? p : `${p}/`;
}

export function tickerHref(symbol: string): string {
  return href(`/ticker/${encodeURIComponent(symbol.toUpperCase())}`);
}

export function themeHref(slug: string): string {
  return href(`/theme/${slug}`);
}
