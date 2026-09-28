import type { Metadata } from "next";
import Link from "next/link";

import { NewsBrowser } from "@/components/NewsBrowser";
import { loadAllNewsIndex, loadLatestNewsStories } from "@/lib/allNewsServer";
import { href } from "@/lib/links";

export const metadata: Metadata = {
  title: "News · Stock Context",
};

const FIRST_PAGE = 15;

export default async function NewsPage() {
  const index = await loadAllNewsIndex();
  const initialStories = await loadLatestNewsStories(index, FIRST_PAGE);

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / News"}
      </p>
      <h1>News</h1>
      {index ? (
        <NewsBrowser
          initialStories={initialStories}
          windowDays={index.window_days}
          pageSize={FIRST_PAGE}
        />
      ) : (
        <p className="muted">No news feed loaded yet.</p>
      )}
    </>
  );
}
