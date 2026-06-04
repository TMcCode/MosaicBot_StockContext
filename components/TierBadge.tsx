export function TierBadge({ tier }: { tier?: number | null }) {
  if (tier == null) return null;
  return <span className={`badge badge-tier badge-tier-${tier}`}>T{tier}</span>;
}
