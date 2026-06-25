import Link from "next/link";

import type { HomeSectionKind } from "@/lib/homeFeedDisplay";
import { splitThemeGroupLabel } from "@/lib/themeDisplayName";

type Props = {
  label: string;
  href: string | null;
  kind: HomeSectionKind;
};

export function HomeFeedItemTitle({ label, href, kind }: Props) {
  const split = kind === "theme" ? splitThemeGroupLabel(label) : null;

  const content = (
    <>
      <span className="home-feed-title-desktop">{label}</span>
      {split ? (
        <span className="home-feed-title-mobile">
          <span className="home-feed-title-mobile-text">{split.title}</span>
          <span className="home-feed-title-mobile-group muted">{split.group}</span>
        </span>
      ) : (
        <span className="home-feed-title-mobile home-feed-title-mobile-plain">{label}</span>
      )}
    </>
  );

  if (href) {
    return (
      <Link href={href} className="home-feed-title" aria-label={label}>
        {content}
      </Link>
    );
  }

  return <span className="home-feed-title">{content}</span>;
}
