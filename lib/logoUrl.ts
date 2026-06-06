const STOCKTHEMES_CDN = "https://storage.stockthemes.ai";

/** Browser-loadable logo URL (GCS direct links are 403; CDN serves logos/v0/). */
export function resolveTickerLogoUrl(url?: string | null): string | null {
  const raw = url?.trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(
    /^https:\/\/storage\.googleapis\.com\/[^/]+\/(logos\/v0\/.+)$/i,
  );
  if (match) {
    return `${STOCKTHEMES_CDN}/${match[1]}`;
  }
  return raw;
}
