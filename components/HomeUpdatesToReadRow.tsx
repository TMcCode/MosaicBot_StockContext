import type { HomeFeedSection } from "@/lib/homeFeedDisplay";

import { HomeUpdatesToReadPanel } from "./HomeUpdatesToReadPanel";

type Props = {
  tickerSection?: HomeFeedSection;
  themeSection?: HomeFeedSection;
};

/** Top home row: daily ticker + theme updates (read-filtered, inline mark-as-read). */
export function HomeUpdatesToReadRow({ tickerSection, themeSection }: Props) {
  if (!tickerSection && !themeSection) {
    return null;
  }

  return (
    <>
      {tickerSection ? (
        <HomeUpdatesToReadPanel section={tickerSection} pageType="ticker" />
      ) : null}
      {themeSection ? (
        <HomeUpdatesToReadPanel section={themeSection} pageType="theme" />
      ) : null}
    </>
  );
}
