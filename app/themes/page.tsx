import Link from "next/link";

import { TextTableActivityStats } from "@/components/TextTableActivityStats";
import { ThemeBrowse } from "@/components/ThemeBrowse";
import { loadManifest } from "@/lib/data";
import { href } from "@/lib/links";

export default async function ThemesPage() {
  const manifest = await loadManifest();

  if (!manifest?.themes?.length) {
    return (
      <div className="card">
        <h1>Themes</h1>
        <p className="muted">
          No theme index loaded. Republish and reload, or run <code>npm run sync:cache:feeds</code>.
        </p>
      </div>
    );
  }

  const themes = [...manifest.themes].sort((a, b) => {
    const aHas = a.has_table_data !== false && a.meta_url ? 0 : 1;
    const bHas = b.has_table_data !== false && b.meta_url ? 0 : 1;
    if (aHas !== bHas) return aHas - bHas;
    return a.name.localeCompare(b.name);
  });

  const withData = themes.filter((t) => t.has_table_data !== false && t.meta_url).length;

  return (
    <>
      <p className="muted">
        <Link href={href("/")}>Home</Link>
        {" / Themes"}
      </p>
      <h1>Themes</h1>
      <p className="muted">
        {withData} with research · {themes.length} total in MosaicBot
      </p>
      <TextTableActivityStats manifest={manifest} />
      <section className="card">
        <ThemeBrowse themes={themes} />
      </section>
    </>
  );
}
