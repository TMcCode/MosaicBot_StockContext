/** Parse tier from home-feed badge strings like "T1". */
export function tierFromBadge(badge?: string | null): number | null {
  if (!badge || !badge.startsWith("T")) return null;
  const n = Number.parseInt(badge.slice(1), 10);
  return Number.isFinite(n) ? n : null;
}
